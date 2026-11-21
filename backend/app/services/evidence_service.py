import uuid
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.finding import Finding
from app.models.evidence import Evidence
from app.models.base import utc_now

class EvidenceAnalysisService:
    """
    Analyzes normalized evidence records and derives structured, evidence-backed
    security findings with confidence levels, OWASP category mapping, and remediation steps.
    Supports both canonical (e.g. vuln.sensitive_files) and unprefixed (e.g. sensitive_files)
    evidence types produced by autonomous Kali Linux workers.
    """

    @staticmethod
    def analyze_and_record_findings(db: Session, scan_id: uuid.UUID, target_asset: str) -> List[Finding]:
        evidence_items = db.query(Evidence).filter(Evidence.scan_id == scan_id).all()
        created_findings = []
        existing_keys = set(f.finding_key for f in db.query(Finding).filter(Finding.scan_id == scan_id).all())

        def add_finding_if_unique(finding: Finding):
            if finding.finding_key not in existing_keys:
                existing_keys.add(finding.finding_key)
                db.add(finding)
                created_findings.append(finding)

        for ev in evidence_items:
            data = ev.normalized_data or {}
            ev_id = str(ev.id)
            raw_type = (ev.evidence_type or "").lower().strip()

            # Clean namespace prefixes (e.g. vuln., http., network., osint., dns.)
            clean_type = raw_type
            for pfx in ("vuln.", "http.", "network.", "osint.", "dns."):
                if clean_type.startswith(pfx):
                    clean_type = clean_type[len(pfx):]

            # 0. WHOIS & Domain Intelligence Findings
            if clean_type == "whois" or "whois" in clean_type:
                dnssec = data.get("dnssec", "unsigned")
                if dnssec == "unsigned" or not data.get("has_dnssec", False):
                    add_finding_if_unique(Finding(
                        scan_id=scan_id,
                        finding_key="SEC_WHOIS_DNSSEC_UNSIGNED",
                        title="Unsigned DNSSEC (Domain Name System Security Extensions)",
                        category="osint",
                        severity="low",
                        confidence="confirmed",
                        affected_asset=target_asset,
                        description="The domain does not have active DNSSEC records published in its TLD registry. Without cryptographic signatures, recursive resolvers cannot validate DNS record authenticity.",
                        impact="Adversaries performing Man-in-the-Middle (MitM) attacks or DNS cache poisoning can spoof responses and redirect users to malicious infrastructure.",
                        remediation="Enable DNSSEC signing with your domain registrar and DNS provider, ensuring a valid Delegation Signer (DS) record is published to the parent zone.",
                        references=["https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Protection_Cheat_Sheet.html"],
                        evidence_ids=[ev_id]
                    ))

            # 1. DNS Findings (SPF / DMARC)
            if clean_type in ("records", "lookup", "dns_lookup", "email_spoofing") or "dns" in clean_type:
                if not data.get("has_spf", True):
                    add_finding_if_unique(Finding(
                        scan_id=scan_id,
                        finding_key="SEC_DNS_SPF_MISSING",
                        title="Missing Sender Policy Framework (SPF) DNS Record",
                        category="dns",
                        severity="medium",
                        confidence="confirmed",
                        affected_asset=target_asset,
                        description="The domain does not publish an SPF TXT record, allowing unauthorized mail servers to forge emails from this domain.",
                        impact="Attackers can spoof emails appearing to originate from this domain, increasing phishing success against users and partners.",
                        remediation="Add a TXT record to the domain's DNS zone specifying permitted mail servers (e.g., 'v=spf1 include:_spf.example.com ~all').",
                        references=["https://owasp.org/www-community/attacks/Email_Spoofing"],
                        evidence_ids=[ev_id]
                    ))

                if not data.get("has_dmarc", True):
                    add_finding_if_unique(Finding(
                        scan_id=scan_id,
                        finding_key="SEC_DNS_DMARC_MISSING",
                        title="Missing DMARC Email Authentication Policy",
                        category="dns",
                        severity="low",
                        confidence="confirmed",
                        affected_asset=target_asset,
                        description="No DMARC record (_dmarc) is configured for the domain to specify policy enforcement for SPF/DKIM failures.",
                        impact="Without DMARC enforcement, receiving mail transfer agents cannot verify domain legitimacy or report unauthorized sender activity.",
                        remediation="Publish a DMARC TXT record at '_dmarc.yourdomain.com' with an appropriate policy such as 'v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com'.",
                        references=["https://dmarc.org/overview/"],
                        evidence_ids=[ev_id]
                    ))

            # 2. TLS & SSL Cryptographic Flaws
            if clean_type in ("ssl_tls_flaws", "tls_ciphers", "certificate") or ("tls" in clean_type or "ssl" in clean_type or "cipher" in clean_type):
                if data.get("is_expired"):
                    add_finding_if_unique(Finding(
                        scan_id=scan_id,
                        finding_key="SEC_TLS_CERT_EXPIRED",
                        title="Expired TLS/SSL Certificate",
                        category="tls",
                        severity="critical",
                        confidence="confirmed",
                        affected_asset=target_asset,
                        description=f"The TLS certificate for {target_asset} has expired.",
                        impact="Browsers will display severe security warnings, blocking legitimate user access and opening opportunities for interception.",
                        remediation="Renew and deploy an active, valid TLS certificate signed by a recognized Certificate Authority.",
                        references=["https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Security_Cheat_Sheet.html"],
                        evidence_ids=[ev_id]
                    ))

                if data.get("tls_version") in ("TLSv1", "TLSv1.1", "SSLv3"):
                    add_finding_if_unique(Finding(
                        scan_id=scan_id,
                        finding_key="SEC_TLS_DEPRECATED_PROTOCOL",
                        title="Deprecated TLS Protocol Version Enabled",
                        category="tls",
                        severity="high",
                        confidence="confirmed",
                        affected_asset=target_asset,
                        description=f"The server negotiates deprecated protocol version {data.get('tls_version')}.",
                        impact="Legacy TLS protocols (v1.0 and v1.1) have known cryptographic weaknesses and fail regulatory compliance (PCI-DSS).",
                        remediation="Disable TLS 1.0 and TLS 1.1 on your reverse proxy or web server; enforce TLS 1.2 and TLS 1.3 exclusively.",
                        references=["https://datatracker.ietf.org/doc/rfc8996/"],
                        evidence_ids=[ev_id]
                    ))

                for fl in data.get("vulnerabilities", []):
                    fl_key = fl.get("vuln_key") or f"SEC_TLS_FLAW_{fl.get('title', 'GENERIC').replace(' ', '_').upper()}"
                    add_finding_if_unique(Finding(
                        scan_id=scan_id,
                        finding_key=fl_key,
                        title=fl.get("title", "TLS Protocol Vulnerability"),
                        category="tls",
                        severity=fl.get("severity", "medium"),
                        confidence="confirmed",
                        affected_asset=target_asset,
                        description=fl.get("description", "Cryptographic weakness in TLS protocol negotiation."),
                        impact="Allows adversaries with network interception capabilities to downgrade or decrypt encrypted communications.",
                        remediation="Disable deprecated SSLv3, TLS 1.0, and TLS 1.1 in web server and TLS termination configurations.",
                        references=["https://datatracker.ietf.org/doc/rfc8996/"],
                        evidence_ids=[ev_id]
                    ))

            # 3. HTTP Security Headers
            if clean_type in ("security_headers", "headers") or "header" in clean_type:
                missing = data.get("missing_defensive_headers", [])
                if "Strict-Transport-Security" in missing:
                    add_finding_if_unique(Finding(
                        scan_id=scan_id,
                        finding_key="SEC_HEADER_HSTS_MISSING",
                        title="Missing HTTP Strict Transport Security (HSTS) Header",
                        category="headers",
                        severity="medium",
                        confidence="confirmed",
                        affected_asset=target_asset,
                        description="The HTTP response does not include the Strict-Transport-Security header.",
                        impact="Allows man-in-the-middle attackers to perform SSL-stripping and downgrade encrypted HTTPS traffic to unencrypted HTTP.",
                        remediation="Configure the web server to emit: 'Strict-Transport-Security: max-age=31536000; includeSubDomains; preload'.",
                        references=["https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Strict_Transport_Security_Cheat_Sheet.html"],
                        evidence_ids=[ev_id]
                    ))

                if "Content-Security-Policy" in missing:
                    add_finding_if_unique(Finding(
                        scan_id=scan_id,
                        finding_key="SEC_HEADER_CSP_MISSING",
                        title="Missing Content-Security-Policy (CSP) Header",
                        category="headers",
                        severity="medium",
                        confidence="confirmed",
                        affected_asset=target_asset,
                        description="The application does not declare a Content-Security-Policy header to restrict authorized resource loading.",
                        impact="Significantly increases exposure to Cross-Site Scripting (XSS), malicious script injection, and clickjacking.",
                        remediation="Define a robust CSP directive (e.g. 'default-src \\'self\\'; script-src \\'self\\'; object-src \\'none\\'') tailored to the application.",
                        references=["https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html"],
                        evidence_ids=[ev_id]
                    ))

                if "X-Frame-Options" in missing:
                    add_finding_if_unique(Finding(
                        scan_id=scan_id,
                        finding_key="SEC_HEADER_XFO_MISSING",
                        title="Missing Anti-Clickjacking Header (X-Frame-Options)",
                        category="headers",
                        severity="low",
                        confidence="confirmed",
                        affected_asset=target_asset,
                        description="The server does not specify X-Frame-Options to control whether the page can be embedded in an <iframe>.",
                        impact="Attackers can embed the target application within a transparent frame on a malicious page to perform clickjacking attacks.",
                        remediation="Set 'X-Frame-Options: DENY' or 'X-Frame-Options: SAMEORIGIN', or use CSP 'frame-ancestors \\'self\\''.",
                        references=["https://owasp.org/www-community/attacks/Clickjacking"],
                        evidence_ids=[ev_id]
                    ))

                if "X-Content-Type-Options" in missing:
                    add_finding_if_unique(Finding(
                        scan_id=scan_id,
                        finding_key="SEC_HEADER_XCTO_MISSING",
                        title="Missing X-Content-Type-Options Header",
                        category="headers",
                        severity="low",
                        confidence="confirmed",
                        affected_asset=target_asset,
                        description="The X-Content-Type-Options header is absent from HTTP responses.",
                        impact="Browsers may MIME-sniff response bodies and execute non-executable files (e.g., treating images as HTML/JavaScript).",
                        remediation="Add 'X-Content-Type-Options: nosniff' to all HTTP responses.",
                        references=["https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html"],
                        evidence_ids=[ev_id]
                    ))

                # Also detect wildcard CORS from security_headers if present
                headers_found = data.get("headers_found", {})
                if headers_found.get("access-control-allow-origin") == "*":
                    add_finding_if_unique(Finding(
                        scan_id=scan_id,
                        finding_key="SEC_VULN_CORS_MISCONFIGURATION",
                        title="Insecure Cross-Origin Resource Sharing (CORS) Policy (Origin: *)",
                        category="vuln",
                        severity="medium",
                        confidence="confirmed",
                        affected_asset=target_asset,
                        description="The application responds with 'Access-Control-Allow-Origin: *', allowing arbitrary foreign web origins to initiate cross-origin requests.",
                        impact="Third-party malicious websites visited by an authenticated user can read sensitive cross-origin responses and API payloads.",
                        remediation="Explicitly specify trusted whitelisted domains in the Access-Control-Allow-Origin header instead of using wildcard '*'.",
                        references=["https://cheatsheetseries.owasp.org/cheatsheets/Cross-Origin_Resource_Sharing_Cheat_Sheet.html"],
                        evidence_ids=[ev_id]
                    ))

            # 4. Cookies Security Flags
            if clean_type in ("cookies", "cookie_audit") or "cookie" in clean_type:
                insecure_count = data.get("insecure_cookies_count", 0)
                cookies_list = data.get("cookies", [])
                if insecure_count > 0 or any(not c.get("secure") or not c.get("httponly") for c in cookies_list):
                    cookie_names = [c.get("name", "Unknown") for c in cookies_list if not c.get("secure") or not c.get("httponly")]
                    name_str = f" ({', '.join(cookie_names[:4])})" if cookie_names else ""
                    add_finding_if_unique(Finding(
                        scan_id=scan_id,
                        finding_key="SEC_COOKIE_MISSING_SECURITY_FLAGS",
                        title=f"Cookies Missing Secure or HttpOnly Flags{name_str}",
                        category="cookies",
                        severity="medium",
                        confidence="confirmed",
                        affected_asset=target_asset,
                        description=f"Identified session/tracking cookies{name_str} lacking critical security directives (Secure or HttpOnly).",
                        impact="Cookies missing HttpOnly can be accessed and exfiltrated by malicious JavaScript via XSS. Cookies missing Secure can be transmitted in cleartext over unencrypted channels.",
                        remediation="Configure all session and sensitive cookies with 'Secure; HttpOnly; SameSite=Lax' directives in Set-Cookie headers.",
                        references=["https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html"],
                        evidence_ids=[ev_id]
                    ))

            # 5. Server Information Disclosure
            if clean_type in ("server_disclosure", "server_leak") or ("server" in clean_type and "status" not in clean_type):
                disclosed = data.get("disclosed_technologies", [])
                server = data.get("disclosed_server")
                powered = data.get("disclosed_powered_by")
                if server and server != "Not Disclosed" and server not in disclosed:
                    disclosed.append(f"Server: {server}")
                if powered and powered != "Not Disclosed" and powered not in disclosed:
                    disclosed.append(f"X-Powered-By: {powered}")

                if disclosed:
                    add_finding_if_unique(Finding(
                        scan_id=scan_id,
                        finding_key="SEC_SERVER_INFO_DISCLOSURE",
                        title="Web Server and Framework Version Information Disclosure",
                        category="server_leak",
                        severity="informational",
                        confidence="confirmed",
                        affected_asset=target_asset,
                        description=f"The server reveals internal infrastructure and software versions: {', '.join(disclosed)}",
                        impact="Disclosed version strings assist adversaries in fingerprinting technology stacks and identifying version-specific CVEs.",
                        remediation="Disable or sanitize the 'Server' and 'X-Powered-By' response headers in the web server or reverse proxy configuration.",
                        references=["https://cheatsheetseries.owasp.org/cheatsheets/Information_Leakage_Cheat_Sheet.html"],
                        evidence_ids=[ev_id]
                    ))

            # 6. Sensitive Files & Path Disclosure
            if clean_type in ("sensitive_files",) or "sensitive" in clean_type:
                exposed = data.get("exposed_files", [])
                for item in exposed:
                    path = item.get("path", "")
                    ftype = item.get("type", "Sensitive File Exposed")
                    fsev = (item.get("severity") or "high").lower()
                    if fsev in ("critical", "high", "medium"):
                        clean_path = path.replace("/", "_").replace(".", "_").replace("-", "_").strip("_")
                        add_finding_if_unique(Finding(
                            scan_id=scan_id,
                            finding_key=f"SEC_VULN_FILE_{clean_path}",
                            title=f"Sensitive Path Exposure: {path} ({ftype})",
                            category="vuln",
                            severity=fsev,
                            confidence="confirmed",
                            affected_asset=target_asset,
                            description=f"Publicly accessible sensitive administrative path or source file identified at '{path}'. Snippet: {item.get('snippet', '')[:200]}",
                            impact="Adversaries can extract internal source code, database credentials, administrative functions, or architectural blueprints.",
                            remediation=f"Block public HTTP access to '{path}' immediately in reverse proxy/web server configurations, or enforce strong multi-factor authentication.",
                            references=["https://owasp.org/www-project-top-ten/2017/A6_2017-Security_Misconfiguration"],
                            evidence_ids=[ev_id]
                        ))

            # 7. CVE Vulnerability Correlation (Rapid7 / NVD / Nessus-style CVEs)
            if clean_type in ("cve_correlation", "cve_exploit") or "cve" in clean_type:
                cves = data.get("identified_cves", [])
                for c in cves:
                    cve_id = c.get("cve_id", "CVE-UNKNOWN")
                    cvss = float(c.get("cvss_score", 7.0))
                    if cvss >= 9.0:
                        sev = "critical"
                    elif cvss >= 7.0:
                        sev = "high"
                    elif cvss >= 4.0:
                        sev = "medium"
                    else:
                        sev = "low"

                    refs = [
                        c.get("nvd_url") or f"https://nvd.nist.gov/vuln/detail/{cve_id}",
                        c.get("rapid7_url") or "https://www.rapid7.com/db/"
                    ]

                    add_finding_if_unique(Finding(
                        scan_id=scan_id,
                        finding_key=cve_id,
                        title=f"{cve_id}: {c.get('title') or 'Known Software Vulnerability'}",
                        category="cve",
                        severity=sev,
                        confidence="confirmed",
                        affected_asset=target_asset,
                        description=c.get("description") or f"Known vulnerability affecting software stack on {target_asset}.",
                        impact=c.get("impact") or "Allows remote adversaries to compromise application confidentiality, integrity, or availability.",
                        remediation=c.get("remediation") or "Apply vendor security patches or upgrade to the latest supported software release.",
                        references=refs,
                        evidence_ids=[ev_id]
                    ))

            # 8. CORS Misconfiguration Vulnerability
            if clean_type in ("cors_misconfiguration", "cors_reflection", "cors") or "cors" in clean_type:
                if data.get("has_cors_vulnerability") or data.get("access_control_allow_origin") == "*":
                    origin = data.get("access_control_allow_origin", "*")
                    with_creds = data.get("allow_credentials", False)
                    sev = "high" if with_creds else "medium"
                    add_finding_if_unique(Finding(
                        scan_id=scan_id,
                        finding_key="SEC_VULN_CORS_MISCONFIGURATION",
                        title=f"Insecure Cross-Origin Resource Sharing (CORS) Policy (Origin: {origin})",
                        category="vuln",
                        severity=sev,
                        confidence="confirmed",
                        affected_asset=target_asset,
                        description=f"The application responds with 'Access-Control-Allow-Origin: {origin}', allowing arbitrary foreign web origins to initiate cross-origin requests.",
                        impact="Third-party malicious websites visited by an authenticated user can read sensitive cross-origin responses and API payloads.",
                        remediation="Explicitly specify trusted whitelisted domains in the Access-Control-Allow-Origin header instead of using wildcard '*' or dynamic origin reflection.",
                        references=["https://cheatsheetseries.owasp.org/cheatsheets/Cross-Origin_Resource_Sharing_Cheat_Sheet.html"],
                        evidence_ids=[ev_id]
                    ))

            # 9. Dangerous HTTP Methods
            if clean_type in ("http_methods", "methods") or "method" in clean_type:
                dang = data.get("dangerous_methods", [])
                if dang:
                    add_finding_if_unique(Finding(
                        scan_id=scan_id,
                        finding_key="SEC_VULN_DANGEROUS_HTTP_METHODS",
                        title=f"Dangerous HTTP Methods Enabled: {', '.join(dang)}",
                        category="vuln",
                        severity="medium",
                        confidence="confirmed",
                        affected_asset=target_asset,
                        description=f"The server advertises support for potentially dangerous HTTP methods: {', '.join(dang)}.",
                        impact="Methods such as TRACE enable Cross-Site Tracing (XST) to steal HttpOnly cookies. PUT and DELETE can allow unauthorized resource modification.",
                        remediation="Disable TRACE, PUT, and DELETE methods in web server configuration unless explicitly required by an authenticated REST API.",
                        references=["https://owasp.org/www-community/attacks/Cross_Site_Tracing"],
                        evidence_ids=[ev_id]
                    ))

            # 10. Subresource Integrity (SRI)
            if clean_type in ("subresource_integrity", "sri") or "sri" in clean_type or "integrity" in clean_type:
                missing_sri = data.get("missing_sri_count", 0)
                vuln_scripts = data.get("vulnerable_scripts", [])
                if missing_sri > 0 or vuln_scripts:
                    scripts_str = f": {', '.join(vuln_scripts[:3])}" if vuln_scripts else ""
                    add_finding_if_unique(Finding(
                        scan_id=scan_id,
                        finding_key="SEC_VULN_MISSING_SRI",
                        title=f"Subresource Integrity (SRI) Not Enforced for External Scripts",
                        category="vuln",
                        severity="low",
                        confidence="confirmed",
                        affected_asset=target_asset,
                        description=f"External third-party scripts loaded by the application lack 'integrity' attribute hashes{scripts_str}.",
                        impact="If a third-party CDN is compromised, an attacker can modify scripts to execute malicious JavaScript within the user's browser context (Magecart / Supply Chain attacks).",
                        remediation="Add cryptographic 'integrity=\"sha384-...\"' and 'crossorigin=\"anonymous\"' attributes to all external <script> and <link> elements.",
                        references=["https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity"],
                        evidence_ids=[ev_id]
                    ))

            # 11. Directory Indexing
            if clean_type in ("directory_indexing", "indexing") or "directory" in clean_type:
                indexed = data.get("indexed_directories", [])
                if indexed or data.get("has_directory_listing"):
                    idx_str = f" on {', '.join(indexed)}" if indexed else ""
                    add_finding_if_unique(Finding(
                        scan_id=scan_id,
                        finding_key="SEC_VULN_DIRECTORY_LISTING_ENABLED",
                        title="Directory Indexing / Directory Listing Enabled",
                        category="vuln",
                        severity="medium",
                        confidence="confirmed",
                        affected_asset=target_asset,
                        description=f"Web server automatically generates directory index listings for directories lacking default index files{idx_str}.",
                        impact="Adversaries can browse and download internal assets, source backups, configuration files, or user uploads.",
                        remediation="Disable directory browsing in web server configuration (e.g. 'Options -Indexes' in Apache, 'autoindex off;' in Nginx).",
                        references=["https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/01-Information_Gathering/02-Fingerprint_Web_Server"],
                        evidence_ids=[ev_id]
                    ))

            # 12. Open Redirect
            if clean_type in ("open_redirect", "redirect") or "redirect" in clean_type:
                if data.get("is_vulnerable"):
                    add_finding_if_unique(Finding(
                        scan_id=scan_id,
                        finding_key="SEC_VULN_OPEN_REDIRECT",
                        title="Unvalidated Open URL Redirection Vulnerability",
                        category="vuln",
                        severity="medium",
                        confidence="confirmed",
                        affected_asset=target_asset,
                        description="Application accepts unvalidated user input in redirect parameters, allowing arbitrary redirection to foreign websites.",
                        impact="Attackers exploit open redirects in phishing campaigns to lend credibility to phishing links using the trusted domain.",
                        remediation="Implement strict server-side whitelisting of allowed redirect destination URLs or enforce relative-only URL redirection.",
                        references=["https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html"],
                        evidence_ids=[ev_id]
                    ))

            # 13. Debug Error Leakage
            if clean_type in ("debug_error_leakage", "debug_leakage") or "debug" in clean_type or "leakage" in clean_type:
                if data.get("leakage_detected"):
                    add_finding_if_unique(Finding(
                        scan_id=scan_id,
                        finding_key="SEC_VULN_DEBUG_ERROR_LEAKAGE",
                        title="Detailed Debug Error & Stack Trace Leakage",
                        category="vuln",
                        severity="medium",
                        confidence="confirmed",
                        affected_asset=target_asset,
                        description="Application displays verbose runtime stack traces, database syntax errors, or debug diagnostics when triggered with anomalous inputs.",
                        impact="Adversaries gain immediate insight into internal file paths, framework versions, database structures, and backend libraries.",
                        remediation="Disable debug mode in production; implement generic error pages and log detailed error traces server-side only.",
                        references=["https://cheatsheetseries.owasp.org/cheatsheets/Information_Leakage_Cheat_Sheet.html"],
                        evidence_ids=[ev_id]
                    ))

            # 14. Network Port Surface / Nmap Scan
            if clean_type in ("nmap_scan", "port_surface", "port_scan") or ("port" in clean_type and "portal" not in clean_type):
                open_ports = data.get("open_ports", [])
                for port_info in open_ports:
                    port_num = port_info.get("port")
                    service = port_info.get("service", "unknown")
                    if port_num in (21, 22, 23, 25, 8080, 8443):
                        sev = "medium" if port_num in (21, 23) else "low"
                        add_finding_if_unique(Finding(
                            scan_id=scan_id,
                            finding_key=f"SEC_PORT_{port_num}_EXPOSED",
                            title=f"Publicly Accessible Service Port: {port_num}/{service.upper()}",
                            category="network",
                            severity=sev,
                            confidence="confirmed",
                            affected_asset=target_asset,
                            description=f"The port sweep identified port {port_num} ({service}) in an open/responsive state on {data.get('resolved_ip', target_asset)}.",
                            impact="Exposing unnecessary administrative or legacy service ports expands the public attack surface and allows unauthorized access attempts.",
                            remediation=f"Restrict port {port_num} via firewall rules or security groups so it is accessible only by authorized management bastions or VPNs.",
                            references=["https://cheatsheetseries.owasp.org/cheatsheets/Attack_Surface_Analysis_Cheat_Sheet.html"],
                            evidence_ids=[ev_id]
                        ))
                    elif port_num == 80:
                        add_finding_if_unique(Finding(
                            scan_id=scan_id,
                            finding_key="SEC_PORT_80_HTTP_UNENCRYPTED",
                            title="Unencrypted HTTP Service (Port 80) Publicly Responsive",
                            category="network",
                            severity="low",
                            confidence="confirmed",
                            affected_asset=target_asset,
                            description=f"Cleartext HTTP service is responding on port 80 of {data.get('resolved_ip', target_asset)}.",
                            impact="Unencrypted communication can be intercepted, inspected, or modified by on-path adversaries if automatic HTTPS redirection is not enforced.",
                            remediation="Configure a permanent 301 HTTP-to-HTTPS redirect rule for all requests arriving on port 80.",
                            references=["https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Protection_Cheat_Sheet.html"],
                            evidence_ids=[ev_id]
                        ))

        db.commit()
        return created_findings
