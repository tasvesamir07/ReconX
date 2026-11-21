import ssl
import socket
import urllib.parse
import hashlib
import json
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import httpx
import dns.resolver

def compute_hash(data: Any) -> str:
    raw = json.dumps(data, sort_keys=True, default=str).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()

class CapabilityDefinition:
    def __init__(
        self,
        capability_id: str,
        name: str,
        category: str,
        description: str,
        timeout_seconds: int = 15
    ):
        self.capability_id = capability_id
        self.name = name
        self.category = category
        self.description = description
        self.timeout_seconds = timeout_seconds

class CapabilityRegistry:
    CAPABILITIES = {
        "osint.whois": CapabilityDefinition(
            capability_id="osint.whois",
            name="Domain WHOIS & DNSSEC Intelligence",
            category="osint",
            description="Queries WHOIS registry for domain registrar, creation/expiry dates, nameservers, and DNSSEC signing status."
        ),
        "dns.lookup": CapabilityDefinition(
            capability_id="dns.lookup",
            name="DNS Zone & Record Inspection",
            category="dns",
            description="Examines public DNS zone configuration including A, AAAA, MX, TXT, SPF, DMARC, and CAA records."
        ),
        "dns.records": CapabilityDefinition(
            capability_id="dns.records",
            name="DNS Configuration & Records",
            category="dns",
            description="Examines public DNS zone configuration including A, AAAA, MX, TXT, SPF, and DMARC records."
        ),
        "osint.endpoints": CapabilityDefinition(
            capability_id="osint.endpoints",
            name="OSINT Endpoint & Policy Discovery",
            category="osint",
            description="Probes robots.txt, sitemap.xml, and /.well-known/security.txt for sensitive endpoints and disclosure policies."
        ),
        "network.nmap_scan": CapabilityDefinition(
            capability_id="network.nmap_scan",
            name="Network Service & Port Surface",
            category="network",
            description="Safely inspects exposure of standard network service ports (HTTP, HTTPS, SSH, FTP, SMTP) within approved scope using Nmap."
        ),
        "network.port_surface": CapabilityDefinition(
            capability_id="network.port_surface",
            name="Network Service & Port Surface",
            category="network",
            description="Safely inspects exposure of standard network service ports (HTTP, HTTPS, SSH, FTP, SMTP) within approved scope."
        ),
        "tls.certificate": CapabilityDefinition(
            capability_id="tls.certificate",
            name="TLS/SSL Security & Certificate",
            category="tls",
            description="Inspects TLS certificate validity, expiration, subject names, and supported protocol versions."
        ),
        "http.security_headers": CapabilityDefinition(
            capability_id="http.security_headers",
            name="HTTP Security Headers",
            category="headers",
            description="Evaluates critical defensive headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options)."
        ),
        "http.cookies": CapabilityDefinition(
            capability_id="http.cookies",
            name="Cookie Security Flags",
            category="cookies",
            description="Checks application cookies for Secure, HttpOnly, and SameSite protection flags."
        ),
        "http.server_disclosure": CapabilityDefinition(
            capability_id="http.server_disclosure",
            name="Server Information Disclosure",
            category="server_leak",
            description="Detects sensitive infrastructure version disclosure in HTTP headers and response metadata."
        ),
        "vuln.cors_misconfiguration": CapabilityDefinition(
            capability_id="vuln.cors_misconfiguration",
            name="CORS Origin Reflection Vulnerability Audit",
            category="vuln",
            description="Tests if arbitrary cross-origin requests are allowed with credentials."
        ),
        "vuln.cve_correlation": CapabilityDefinition(
            capability_id="vuln.cve_correlation",
            name="Software Version & CVE Correlation Engine",
            category="cve",
            description="Cross-references all detected software versions against NVD and Rapid7 vulnerability databases."
        ),
        "vuln.sensitive_files": CapabilityDefinition(
            capability_id="vuln.sensitive_files",
            name="Sensitive Files & Source Repository Exposure",
            category="vuln",
            description="Probes for critical exposed paths (/.git/HEAD, /.env, /backup.zip, phpinfo)."
        ),
        "vuln.ssl_tls_flaws": CapabilityDefinition(
            capability_id="vuln.ssl_tls_flaws",
            name="Cryptographic Protocol & Cipher Weakness Audit",
            category="tls",
            description="Tests for deprecated protocols (SSLv3, TLS 1.0, TLS 1.1) and weak ciphers."
        ),
        "vuln.http_methods": CapabilityDefinition(
            capability_id="vuln.http_methods",
            name="Unsafe HTTP Methods & WebDAV Vulnerabilities",
            category="vuln",
            description="Audits allowed HTTP methods via OPTIONS for dangerous verbs (PUT, DELETE, TRACE/XST)."
        ),
        "vuln.directory_indexing": CapabilityDefinition(
            capability_id="vuln.directory_indexing",
            name="Directory Indexing & Path Traversal Probe",
            category="vuln",
            description="Probes static, upload, and backup directories for enabled directory listings and path exposure."
        ),
        "vuln.api_exposure": CapabilityDefinition(
            capability_id="vuln.api_exposure",
            name="API & Schema Documentation Exposure",
            category="vuln",
            description="Detects exposed Swagger, OpenAPI, GraphQL, and health endpoints."
        ),
        "vuln.security_txt": CapabilityDefinition(
            capability_id="vuln.security_txt",
            name="Security Policy & Robots Audit",
            category="osint",
            description="Audits RFC 9116 security.txt and robots.txt for sensitive path disclosures and vulnerability reporting policies."
        ),
        "vuln.admin_portals": CapabilityDefinition(
            capability_id="vuln.admin_portals",
            name="Administrative Management Interface Discovery",
            category="vuln",
            description="Probes common admin consoles and management portals for unauthorized exposure."
        ),
        "vuln.waf_detection": CapabilityDefinition(
            capability_id="vuln.waf_detection",
            name="WAF & Edge Security Fingerprinting",
            category="network",
            description="Fingerprints Web Application Firewall protections and bypass resistance."
        ),
        "vuln.certificate_transparency": CapabilityDefinition(
            capability_id="vuln.certificate_transparency",
            name="X.509 Certificate Transparency & SAN Discovery",
            category="tls",
            description="Extracts Subject Alternative Names (SAN) to enumerate associated subdomains and certificates."
        ),
        "vuln.open_redirect": CapabilityDefinition(
            capability_id="vuln.open_redirect",
            name="Unvalidated HTTP Redirection Audit",
            category="vuln",
            description="Tests URL query parameters for arbitrary external redirect vulnerabilities."
        ),
        "vuln.debug_error_leakage": CapabilityDefinition(
            capability_id="vuln.debug_error_leakage",
            name="Stack Trace & Debug Error Disclosure",
            category="vuln",
            description="Induces error conditions to detect stack traces, framework errors, or database leakages."
        ),
        "vuln.subdomain_takeover": CapabilityDefinition(
            capability_id="vuln.subdomain_takeover",
            name="Subdomain Takeover & Dangling DNS Audit",
            category="dns",
            description="Audits CNAME records for orphaned cloud services and dangling third-party pointers."
        ),
        "vuln.email_spoofing": CapabilityDefinition(
            capability_id="vuln.email_spoofing",
            name="Email Spoofing & SPF/DMARC Policy Enforcement",
            category="dns",
            description="Evaluates SPF alignment and DMARC enforcement modes for email spoofing vulnerability."
        ),
        "network.service_enumeration": CapabilityDefinition(
            capability_id="network.service_enumeration",
            name="Expanded High-Risk Service Port Enumeration",
            category="network",
            description="Safely inspects expanded application, database, and cache service ports."
        ),
        "vuln.websocket_audit": CapabilityDefinition(
            capability_id="vuln.websocket_audit",
            name="WebSocket Handshake & Origin Validation Audit",
            category="vuln",
            description="Audits WebSocket upgrade endpoints for missing origin checks and CSWSH exposure."
        ),
        "vuln.http_cache_poisoning": CapabilityDefinition(
            capability_id="vuln.http_cache_poisoning",
            name="Web Cache Poisoning & Header Reflection Audit",
            category="vuln",
            description="Audits unkeyed headers and cache control policies for web cache poisoning susceptibility."
        ),
        "vuln.subresource_integrity": CapabilityDefinition(
            capability_id="vuln.subresource_integrity",
            name="Subresource Integrity (SRI) CDN Audit",
            category="vuln",
            description="Audits external CDN script and stylesheet tags for missing cryptographic SRI hashes."
        ),
    }

    @classmethod
    def get(cls, capability_id: str) -> Optional[CapabilityDefinition]:
        return cls.CAPABILITIES.get(capability_id)

    @classmethod
    def list_available(cls, permitted_categories: List[str] = None) -> List[Dict[str, Any]]:
        results = []
        for cap in cls.CAPABILITIES.values():
            if not permitted_categories or "all" in permitted_categories or cap.category in permitted_categories:
                results.append({
                    "capability_id": cap.capability_id,
                    "name": cap.name,
                    "category": cap.category,
                    "description": cap.description
                })
        return results

# ─────────────────────────────────────────────────────────────────────────────
# Capability Execution Implementations (Purely Safe, Non-Destructive Checks)
# ─────────────────────────────────────────────────────────────────────────────

async def check_dns_records(canonical_host: str, resolved_ip: str) -> Dict[str, Any]:
    """Inspects public DNS records for SPF, DMARC, MX, and host resolution."""
    evidence = {
        "host": canonical_host,
        "resolved_ip": resolved_ip,
        "mx_records": [],
        "txt_records": [],
        "has_spf": False,
        "has_dmarc": False,
        "dmarc_policy": None,
    }

    resolver = dns.resolver.Resolver()
    resolver.timeout = 5.0
    resolver.lifetime = 5.0

    # MX Records
    try:
        mx_answers = resolver.resolve(canonical_host, "MX")
        evidence["mx_records"] = [str(r.exchange).rstrip(".") for r in mx_answers]
    except Exception:
        pass

    # TXT Records (SPF check)
    try:
        txt_answers = resolver.resolve(canonical_host, "TXT")
        for r in txt_answers:
            txt_str = "".join([part.decode("utf-8", errors="ignore") for part in r.strings])
            evidence["txt_records"].append(txt_str)
            if txt_str.startswith("v=spf1"):
                evidence["has_spf"] = True
    except Exception:
        pass

    # DMARC Record
    try:
        dmarc_host = f"_dmarc.{canonical_host}"
        dmarc_answers = resolver.resolve(dmarc_host, "TXT")
        for r in dmarc_answers:
            txt_str = "".join([part.decode("utf-8", errors="ignore") for part in r.strings])
            if txt_str.startswith("v=DMARC1"):
                evidence["has_dmarc"] = True
                if "p=reject" in txt_str:
                    evidence["dmarc_policy"] = "reject"
                elif "p=quarantine" in txt_str:
                    evidence["dmarc_policy"] = "quarantine"
                elif "p=none" in txt_str:
                    evidence["dmarc_policy"] = "none"
    except Exception:
        pass

    return evidence

async def check_tls_certificate(canonical_host: str, port: int = 443) -> Dict[str, Any]:
    """Inspects TLS certificate parameters on port 443."""
    evidence = {
        "host": canonical_host,
        "port": port,
        "has_tls": False,
        "tls_version": None,
        "cipher": None,
        "cert_subject": {},
        "cert_issuer": {},
        "valid_to": None,
        "is_expired": False,
        "days_remaining": None,
    }

    ctx = ssl.create_default_context()
    ctx.check_hostname = True
    ctx.verify_mode = ssl.CERT_REQUIRED

    try:
        with socket.create_connection((canonical_host, port), timeout=6.0) as sock:
            with ctx.wrap_socket(sock, server_hostname=canonical_host) as ssock:
                cert = ssock.getpeercert()
                evidence["has_tls"] = True
                evidence["tls_version"] = ssock.version()
                cipher_info = ssock.cipher()
                evidence["cipher"] = cipher_info[0] if cipher_info else None

                if cert:
                    # Parse subject & issuer
                    for field in cert.get("subject", ()):
                        for k, v in field:
                            evidence["cert_subject"][k] = v
                    for field in cert.get("issuer", ()):
                        for k, v in field:
                            evidence["cert_issuer"][k] = v

                    not_after = cert.get("notAfter")
                    if not_after:
                        # e.g., 'May 15 12:00:00 2026 GMT'
                        expiry_dt = datetime.strptime(not_after, "%b %d %H:%M:%S %Y %Z").replace(tzinfo=timezone.utc)
                        evidence["valid_to"] = expiry_dt.isoformat()
                        now = datetime.now(timezone.utc)
                        remaining = (expiry_dt - now).days
                        evidence["days_remaining"] = remaining
                        evidence["is_expired"] = remaining < 0
    except Exception as e:
        evidence["error"] = str(e)

    return evidence

async def check_http_security_headers(target_url: str) -> Dict[str, Any]:
    """Evaluates HTTP response security headers."""
    evidence = {
        "target_url": target_url,
        "status_code": None,
        "headers_found": {},
        "missing_defensive_headers": [],
        "hsts_present": False,
        "hsts_preload": False,
        "csp_present": False,
        "x_frame_options": None,
        "x_content_type_options": None,
        "referrer_policy": None,
    }

    async with httpx.AsyncClient(timeout=8.0, follow_redirects=True, verify=True) as client:
        try:
            resp = await client.get(target_url, headers={"User-Agent": "ReconX-Security-Assessment/1.0"})
            evidence["status_code"] = resp.status_code
            headers = {k.lower(): v for k, v in resp.headers.items()}
            evidence["headers_found"] = dict(headers)

            # Strict-Transport-Security
            if "strict-transport-security" in headers:
                evidence["hsts_present"] = True
                if "preload" in headers["strict-transport-security"]:
                    evidence["hsts_preload"] = True
            else:
                evidence["missing_defensive_headers"].append("Strict-Transport-Security")

            # Content-Security-Policy
            if "content-security-policy" in headers:
                evidence["csp_present"] = True
            else:
                evidence["missing_defensive_headers"].append("Content-Security-Policy")

            # X-Frame-Options
            if "x-frame-options" in headers:
                evidence["x_frame_options"] = headers["x_frame_options"]
            else:
                evidence["missing_defensive_headers"].append("X-Frame-Options")

            # X-Content-Type-Options
            if "x-content-type-options" in headers:
                evidence["x_content_type_options"] = headers["x_content_type_options"]
            else:
                evidence["missing_defensive_headers"].append("X-Content-Type-Options")

            # Referrer-Policy
            if "referrer-policy" in headers:
                evidence["referrer_policy"] = headers["referrer-policy"]
            else:
                evidence["missing_defensive_headers"].append("Referrer-Policy")

        except Exception as e:
            evidence["error"] = str(e)

    return evidence

async def check_http_cookies(target_url: str) -> Dict[str, Any]:
    """Analyzes cookies set by the target URL for Secure, HttpOnly, and SameSite flags."""
    evidence = {
        "target_url": target_url,
        "cookies": [],
        "insecure_cookies_count": 0,
    }

    async with httpx.AsyncClient(timeout=8.0, follow_redirects=True, verify=True) as client:
        try:
            resp = await client.get(target_url, headers={"User-Agent": "ReconX-Security-Assessment/1.0"})
            for cookie in client.cookies.jar:
                c_info = {
                    "name": cookie.name,
                    "domain": cookie.domain,
                    "path": cookie.path,
                    "secure": cookie.secure,
                    "httponly": bool(getattr(cookie, "has_nonstandard_attr", lambda x: False)("httponly") or getattr(cookie, "httponly", False)),
                    "samesite": getattr(cookie, "samesite", None),
                }
                if not c_info["secure"] or not c_info["httponly"]:
                    evidence["insecure_cookies_count"] += 1
                evidence["cookies"].append(c_info)
        except Exception as e:
            evidence["error"] = str(e)

    return evidence

async def check_server_disclosure(target_url: str) -> Dict[str, Any]:
    """Inspects headers and banners for detailed software version disclosure."""
    evidence = {
        "target_url": target_url,
        "disclosed_server": None,
        "disclosed_powered_by": None,
        "disclosed_technologies": [],
    }

    async with httpx.AsyncClient(timeout=8.0, follow_redirects=True, verify=True) as client:
        try:
            resp = await client.get(target_url, headers={"User-Agent": "ReconX-Security-Assessment/1.0"})
            headers = {k.lower(): v for k, v in resp.headers.items()}
            
            if "server" in headers:
                evidence["disclosed_server"] = headers["server"]
                evidence["disclosed_technologies"].append(f"Server: {headers['server']}")

            if "x-powered-by" in headers:
                evidence["disclosed_powered_by"] = headers["x_powered_by"]
                evidence["disclosed_technologies"].append(f"X-Powered-By: {headers['x_powered_by']}")

            if "x-aspnet-version" in headers:
                evidence["disclosed_technologies"].append(f"ASP.NET: {headers['x-aspnet-version']}")
        except Exception as e:
            evidence["error"] = str(e)

    return evidence

async def check_network_port_surface(resolved_ip: str) -> Dict[str, Any]:
    """Safe TCP socket probe of standard services (80, 443, 22, 21, 25, 8080)."""
    evidence = {
        "resolved_ip": resolved_ip,
        "open_ports": [],
        "scanned_ports": [80, 443, 22, 21, 25, 8080]
    }
    common_services = {
        80: "http",
        443: "https",
        22: "ssh",
        21: "ftp",
        25: "smtp",
        8080: "http-proxy"
    }
    for port in evidence["scanned_ports"]:
        try:
            reader, writer = await asyncio.wait_for(
                asyncio.open_connection(resolved_ip, port),
                timeout=2.0
            )
            writer.close()
            await writer.wait_closed()
            evidence["open_ports"].append({
                "port": port,
                "protocol": "tcp",
                "state": "open",
                "service": common_services.get(port, "unknown")
            })
        except Exception:
            pass
    return evidence
