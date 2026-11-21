"""
Turns scan evidence into findings.

Three kinds of finding, kept separate everywhere they are shown:
  vulnerability - an exploitable flaw (CVE, exposed secret, open redirect, ...)
  hardening     - a missing or weak defence (headers, cookie flags, TLS, email auth)
  inventory     - attack-surface facts (technologies, open ports, login pages)

Confidence:
  confirmed - directly observed on the target, or verified by an active check
  likely    - the detected version is listed as affected in a vulnerability database
"""
from dataclasses import dataclass, field
from typing import Dict, Iterable, List, Optional, Tuple

from app.intel import catalog
from app.intel.cvss import describe_exploitability, severity_from_score
from app.intel.service import DetectedComponent, VulnMatch
from app.models.finding import HARDENING, INVENTORY, VULNERABILITY

SEVERITY_RANK = {"critical": 0, "high": 1, "medium": 2, "low": 3, "informational": 4}
OWASP_HEADERS = "https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html"


@dataclass
class Draft:
    key: str
    title: str
    category: str
    severity: str
    finding_class: str
    description: str
    impact: str
    remediation: str
    evidence_ids: List[str]
    confidence: str = "confirmed"
    source: str = "check"
    references: List[str] = field(default_factory=list)
    component: Optional[str] = None
    cve_ids: List[str] = field(default_factory=list)
    cwe_ids: List[str] = field(default_factory=list)
    cvss_score: Optional[float] = None
    cvss_vector: Optional[str] = None
    epss_score: Optional[float] = None
    epss_percentile: Optional[float] = None
    is_kev: bool = False


@dataclass
class EvidenceView:
    id: str
    type: str
    data: dict


# ───────────────────────────── check rules ─────────────────────────────

def _headers(ev: EvidenceView, asset: str) -> List[Draft]:
    d = ev.data
    out = []
    specs = {
        "Strict-Transport-Security": ("SEC_HEADER_HSTS_MISSING", "medium", "Missing HTTP Strict Transport Security (HSTS)",
                                      "Without HSTS a network attacker can downgrade a user's first visit to plain HTTP (SSL stripping) and intercept traffic.",
                                      "Send 'Strict-Transport-Security: max-age=31536000; includeSubDomains' on all HTTPS responses."),
        "Content-Security-Policy": ("SEC_HEADER_CSP_MISSING", "low", "Missing Content-Security-Policy",
                                    "Without a CSP, any injected script (XSS) runs with full access to the page and its data.",
                                    "Define a Content-Security-Policy that restricts script sources, e.g. default-src 'self'; object-src 'none'; frame-ancestors 'self'."),
        "X-Frame-Options": ("SEC_HEADER_XFO_MISSING", "low", "Missing clickjacking protection",
                            "The page can be embedded in a frame on another site and used for clickjacking.",
                            "Set 'X-Frame-Options: DENY' (or SAMEORIGIN) or CSP 'frame-ancestors 'self''."),
        "X-Content-Type-Options": ("SEC_HEADER_XCTO_MISSING", "low", "Missing X-Content-Type-Options: nosniff",
                                   "Browsers may MIME-sniff responses and execute content as a different type than intended.",
                                   "Send 'X-Content-Type-Options: nosniff' on all responses."),
        "Referrer-Policy": ("SEC_HEADER_REFERRER_MISSING", "informational", "Missing Referrer-Policy",
                            "Full URLs, including query parameters, may be sent to third-party sites in the Referer header.",
                            "Send 'Referrer-Policy: strict-origin-when-cross-origin'."),
    }
    for header in d.get("missing", []):
        if header not in specs:
            continue
        key, sev, title, impact, fix = specs[header]
        out.append(Draft(key, title, "headers", sev, HARDENING,
                         f"The response from {d.get('url')} (HTTP {d.get('status')}) does not include the {header} header.",
                         impact, fix, [ev.id], references=[OWASP_HEADERS]))
    for w in d.get("weak", []):
        out.append(Draft(f"SEC_HEADER_WEAK_{w['header'].upper().replace('-', '_')}", f"Weak {w['header']}: {w['issue']}",
                         "headers", "low", HARDENING, f"{w['header']} is present but {w['issue']}.",
                         "The header provides less protection than intended.",
                         f"Strengthen the {w['header']} value.", [ev.id], references=[OWASP_HEADERS]))
    return out


def _cookies(ev: EvidenceView, asset: str) -> List[Draft]:
    issues = ev.data.get("issues", [])
    if not issues:
        return []
    session_issue = any("session" in i["issue"] for i in issues)
    names = sorted({i["cookie"] for i in issues})
    detail = "; ".join(f"{i['cookie']}: {i['issue']}" for i in issues[:8])
    return [Draft("SEC_COOKIE_FLAGS", f"Cookies missing security attributes ({', '.join(names[:4])})", "cookies",
                  "medium" if session_issue else "low", HARDENING,
                  f"Set-Cookie attributes observed on {asset}: {detail}.",
                  "A session cookie without HttpOnly can be stolen by injected script; without Secure it can be sent over plain HTTP.",
                  "Set 'Secure; HttpOnly; SameSite=Lax' on session and authentication cookies.", [ev.id],
                  references=["https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html"])]


def _tls(ev: EvidenceView, asset: str) -> List[Draft]:
    d = ev.data
    out = []
    ref = ["https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Security_Cheat_Sheet.html"]
    if d.get("cert_valid") is False:
        err = d.get("cert_error") or "verification failed"
        out.append(Draft("SEC_TLS_CERT_INVALID", f"Invalid TLS certificate: {err}", "tls", "high", VULNERABILITY,
                         f"Certificate validation for {asset} failed: {err}.",
                         "Browsers show security warnings, and users who click through cannot tell a legitimate server from an interceptor.",
                         "Install a valid certificate from a trusted CA that covers this hostname, and automate renewal.", [ev.id], references=ref))
    days = d.get("days_remaining")
    if isinstance(days, int) and 0 <= days < 14:
        out.append(Draft("SEC_TLS_CERT_EXPIRING", f"TLS certificate expires in {days} days", "tls", "medium", HARDENING,
                         f"The certificate for {asset} expires on {d.get('expires')}.",
                         "An expired certificate takes the site offline for most users.",
                         "Renew the certificate now and automate renewal (for example with ACME / Let's Encrypt).", [ev.id], references=ref))
    for proto, info in (d.get("legacy_protocols") or {}).items():
        if info.get("supported"):
            out.append(Draft(f"SEC_TLS_{proto.replace('.', '').upper()}_ENABLED", f"Deprecated {proto} protocol enabled", "tls", "medium", HARDENING,
                             f"The server completed a {proto} handshake ({info.get('note')}).",
                             f"{proto} is deprecated (RFC 8996) and lacks modern protections; it fails PCI DSS requirements.",
                             "Disable TLS 1.0 and 1.1; allow only TLS 1.2 and 1.3.", [ev.id],
                             references=ref + ["https://datatracker.ietf.org/doc/rfc8996/"]))
    if d.get("http_to_https") is False:
        out.append(Draft("SEC_TLS_NO_HTTPS_REDIRECT", "Plain HTTP served without redirect to HTTPS", "tls", "medium", HARDENING,
                         f"http://{asset}/ answered with HTTP {d.get('http_status')} instead of redirecting to HTTPS.",
                         "Users who type the address or follow an http:// link use an unencrypted connection that can be read or modified.",
                         "Redirect all HTTP requests to HTTPS with a 301 and enable HSTS.", [ev.id], references=ref))
    return out


def _cors(ev: EvidenceView, asset: str) -> List[Draft]:
    d = ev.data
    ref = ["https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html#cross-origin-resource-sharing"]
    if d.get("credentialed_reflection"):
        origins = [t["origin_sent"] for t in d.get("tests", []) if t.get("reflected") and t.get("allow_credentials")]
        return [Draft("SEC_VULN_CORS_CREDENTIALED_REFLECTION", "CORS policy trusts arbitrary origins with credentials", "cors", "high",
                      VULNERABILITY,
                      f"{d.get('url')} echoed the request Origin ({', '.join(origins)}) in Access-Control-Allow-Origin together with Access-Control-Allow-Credentials: true.",
                      "Any website a logged-in user visits can read authenticated responses from this application (account data, tokens, CSRF tokens).",
                      "Allow only an explicit list of trusted origins; never reflect the request Origin or allow 'null' when credentials are enabled.",
                      [ev.id], references=ref, cwe_ids=["CWE-942"])]
    if d.get("reflection"):
        return [Draft("SEC_CORS_ORIGIN_REFLECTION", "CORS policy reflects arbitrary origins (without credentials)", "cors", "low", HARDENING,
                      f"{d.get('url')} echoes the request Origin in Access-Control-Allow-Origin, but without credentials.",
                      "Unauthenticated responses can be read cross-origin; this becomes serious if credentials are ever enabled.",
                      "Replace origin reflection with an explicit allow-list.", [ev.id], references=ref, cwe_ids=["CWE-942"])]
    return []


def _sensitive_files(ev: EvidenceView, asset: str) -> List[Draft]:
    out = []
    for item in ev.data.get("exposed", []):
        path = item["path"]
        key = "SEC_VULN_FILE_" + "".join(ch if ch.isalnum() else "_" for ch in path).strip("_").upper()
        out.append(Draft(key, f"{item['title']}: {path}", "exposure", item.get("severity", "high"), VULNERABILITY,
                         f"{path} on {asset} is publicly readable. Verified by content signature: {item.get('proof')}.",
                         "Exposed source code, configuration or backups can reveal credentials, internal hosts and application logic.",
                         f"Remove {path} from the web root or deny access to it at the web server / proxy, then rotate any secrets it contained.",
                         [ev.id], references=["https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/02-Configuration_and_Deployment_Management_Testing/04-Review_Old_Backup_and_Unreferenced_Files_for_Sensitive_Information"],
                         cwe_ids=["CWE-538"]))
    return out


def _email(ev: EvidenceView, asset: str) -> List[Draft]:
    d = ev.data
    out = []
    ref = ["https://www.cisa.gov/sites/default/files/publications/Trustworthy_Email_Guidance.pdf"]
    if d.get("spf_all") == "+all":
        out.append(Draft("SEC_DNS_SPF_PERMISSIVE", "SPF record allows any server to send mail (+all)", "dns", "medium", HARDENING,
                         f"SPF for {d.get('host')}: {d.get('spf')}", "Anyone can send mail that passes SPF for this domain.",
                         "Replace '+all' with '-all' (or '~all') and list only legitimate senders.", [ev.id], references=ref))
    if d.get("mail_domain"):
        if not d.get("spf"):
            out.append(Draft("SEC_DNS_SPF_MISSING", "No SPF record", "dns", "low", HARDENING,
                             f"{d.get('host')} has no SPF TXT record.",
                             "Receiving servers cannot verify which servers may send mail for this domain, making spoofing easier.",
                             "Publish an SPF record listing your mail senders, ending in -all.", [ev.id], references=ref))
        dmarc = d.get("dmarc")
        if not dmarc:
            out.append(Draft("SEC_DNS_DMARC_MISSING", "No DMARC policy", "dns", "low", HARDENING,
                             f"Neither _dmarc.{d.get('host')} nor _dmarc.{d.get('organizational_domain')} publishes a DMARC policy.",
                             "Spoofed mail using this domain is not rejected or reported by receivers.",
                             "Publish a DMARC record, starting with p=none plus reporting, then move to p=quarantine or p=reject.", [ev.id], references=ref))
        elif dmarc.get("policy", "none").lower() == "none":
            out.append(Draft("SEC_DNS_DMARC_MONITOR_ONLY", "DMARC policy is monitoring-only (p=none)", "dns", "low", HARDENING,
                             f"The effective DMARC policy ({dmarc.get('record_at')}) is p=none.",
                             "Spoofed mail is reported but still delivered.",
                             "Move the DMARC policy to p=quarantine or p=reject once legitimate senders pass.", [ev.id], references=ref))
    return out


def _errors(ev: EvidenceView, asset: str) -> List[Draft]:
    out = []
    for hit in ev.data.get("disclosures", []):
        is_sql = hit["type"] == "sql_error"
        out.append(Draft(f"SEC_VULN_ERROR_{hit['type'].upper()}", hit["title"], "error_disclosure", hit["severity"], VULNERABILITY,
                         f"Request {hit['probe']} returned HTTP {hit.get('status')} containing: {hit.get('proof')}",
                         ("A database error triggered by a quote character indicates the input reaches a SQL query unsanitised; "
                          "this is a strong indicator of SQL injection. Confirm manually before relying on it." if is_sql else
                          "Debug output reveals internal paths, framework versions and code, and debuggers can allow code execution."),
                         ("Use parameterised queries for all database access and return generic error pages." if is_sql else
                          "Disable debug mode in production and serve generic error pages; log details server-side."),
                         [ev.id], cwe_ids=["CWE-89"] if is_sql else ["CWE-209"],
                         references=["https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html" if is_sql else
                                     "https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html"]))
    return out


def _listing(ev: EvidenceView, asset: str) -> List[Draft]:
    listed = ev.data.get("listed", [])
    if not listed:
        return []
    paths = ", ".join(x["path"] for x in listed)
    return [Draft("SEC_VULN_DIRECTORY_LISTING", f"Directory listing enabled ({paths})", "exposure", "medium", VULNERABILITY,
                  f"The server returns an auto-generated index for: {paths}.",
                  "Attackers can browse and download every file in these directories, including backups and uploads.",
                  "Disable directory indexes (Apache 'Options -Indexes', nginx 'autoindex off').", [ev.id], cwe_ids=["CWE-548"])]


def _admin(ev: EvidenceView, asset: str) -> List[Draft]:
    out = []
    for c in ev.data.get("management_consoles", []):
        out.append(Draft(f"SEC_ADMIN_CONSOLE_{c['console'].upper().replace(' ', '_')}", f"{c['console']} reachable from the internet ({c['path']})",
                         "exposure", "medium", HARDENING,
                         f"{c['console']} login is publicly reachable at {c['path']} (HTTP {c['status']}).",
                         "Management consoles are a primary target for credential attacks and known exploits.",
                         "Restrict the console to a VPN or IP allow-list, and require strong authentication.", [ev.id]))
    other = [i for i in ev.data.get("interfaces", []) if not i.get("console")]
    if other:
        listing = ", ".join(f"{i['path']} ({'401 auth' if i['type'] == 'auth_protected' else 'login form'})" for i in other)
        out.append(Draft("INV_LOGIN_INTERFACES", "Login and admin interfaces discovered", "inventory", "informational", INVENTORY,
                         f"Authentication entry points: {listing}.",
                         "These are expected entry points; they are listed so they can be included in authentication testing.",
                         "Ensure rate limiting, MFA and lockout are enforced on these endpoints.", [ev.id]))
    return out


def _api(ev: EvidenceView, asset: str) -> List[Draft]:
    out = []
    docs = ev.data.get("api_docs", [])
    if docs:
        out.append(Draft("SEC_API_SCHEMA_PUBLIC", "API schema publicly accessible", "api", "low", HARDENING,
                         "Public API documentation: " + ", ".join(f"{d['path']} ({d['kind']})" for d in docs),
                         "A full map of endpoints and parameters speeds up attacks against the API.",
                         "Serve API documentation only to authenticated users or internal networks.", [ev.id]))
    gql = ev.data.get("graphql_introspection", [])
    if gql:
        out.append(Draft("SEC_GRAPHQL_INTROSPECTION", "GraphQL introspection enabled", "api", "low", HARDENING,
                         "Introspection query answered at " + ", ".join(g["path"] for g in gql),
                         "Attackers can download the complete schema, including internal or unused operations.",
                         "Disable introspection in production.", [ev.id],
                         references=["https://cheatsheetseries.owasp.org/cheatsheets/GraphQL_Cheat_Sheet.html"]))
    return out


def _redirect(ev: EvidenceView, asset: str) -> List[Draft]:
    vuln = ev.data.get("vulnerable", [])
    if not vuln:
        return []
    v = vuln[0]
    return [Draft("SEC_VULN_OPEN_REDIRECT", f"Open redirect via '{v['parameter']}' parameter", "redirect", "medium", VULNERABILITY,
                  f"GET {v['path']}?{v['parameter']}={v['payload']} returned HTTP {v['status']} with Location: {v['location']}. "
                  f"{len(vuln)} vulnerable parameter/endpoint combination(s) found.",
                  "Phishing links can use this trusted domain to send victims to attacker sites, and OAuth flows can leak tokens.",
                  "Only redirect to relative paths or an allow-list of destinations.", [ev.id], cwe_ids=["CWE-601"],
                  references=["https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html"])]


def _methods(ev: EvidenceView, asset: str) -> List[Draft]:
    if not ev.data.get("trace_echo"):
        return []
    return [Draft("SEC_HTTP_TRACE_ENABLED", "HTTP TRACE method enabled", "http", "low", HARDENING,
                  "A TRACE request was echoed back including a custom request header.",
                  "TRACE echoes request headers, which can expose credentials to cross-site tracing in legacy clients.",
                  "Disable TRACE (Apache 'TraceEnable off').", [ev.id], cwe_ids=["CWE-693"])]


def _takeover(ev: EvidenceView, asset: str) -> List[Draft]:
    out = []
    for v in ev.data.get("vulnerable", []):
        out.append(Draft("SEC_VULN_SUBDOMAIN_TAKEOVER", f"Subdomain takeover possible ({v['service']})", "dns", "high", VULNERABILITY,
                         f"{asset} is a CNAME to {v['cname']} and the response shows the {v['service']} 'unclaimed resource' message.",
                         "An attacker can claim the resource and serve arbitrary content on this hostname, including phishing pages and cookie theft.",
                         f"Remove the dangling CNAME or re-claim the {v['service']} resource.", [ev.id],
                         references=["https://github.com/EdOverflow/can-i-take-over-xyz"]))
    return out


RISKY_PORTS = {
    21: ("FTP", "medium"), 23: ("Telnet", "high"), 445: ("SMB", "high"), 3306: ("MySQL", "high"), 5432: ("PostgreSQL", "high"),
    1433: ("Microsoft SQL Server", "high"), 6379: ("Redis", "high"), 27017: ("MongoDB", "high"), 9200: ("Elasticsearch", "high"),
    11211: ("Memcached", "high"), 3389: ("Remote Desktop", "medium"), 5900: ("VNC", "high"), 2375: ("Docker API", "high"),
}


def _services(ev: EvidenceView, asset: str) -> List[Draft]:
    ports = ev.data.get("open_ports", [])
    out = []
    for p in ports:
        if p["port"] in RISKY_PORTS:
            name, sev = RISKY_PORTS[p["port"]]
            out.append(Draft(f"SEC_PORT_{p['port']}_EXPOSED", f"{name} service exposed to the internet (port {p['port']})", "network", sev,
                             HARDENING, f"nmap found {p['port']}/{p['protocol']} open: {p.get('product') or p['service']} {p.get('version') or ''}".strip(),
                             f"{name} should not be reachable from the internet; exposed instances are routinely brute-forced or exploited.",
                             f"Block port {p['port']} at the firewall and allow access only from trusted networks or a VPN.", [ev.id]))
    if ports:
        listing = ", ".join(f"{p['port']}/{p['service']}" + (f" ({p['product']} {p.get('version') or ''})".rstrip() if p.get("product") else "") for p in ports)
        out.append(Draft("INV_OPEN_PORTS", f"{len(ports)} open network port(s)", "inventory", "informational", INVENTORY,
                         f"Open ports: {listing}.", "Every open service is part of the attack surface.",
                         "Close any port that does not need to be public.", [ev.id]))
    return out


def _websocket(ev: EvidenceView, asset: str) -> List[Draft]:
    acc = ev.data.get("cross_origin_upgrades", [])
    if not acc:
        return []
    return [Draft("SEC_WEBSOCKET_ORIGIN", "WebSocket accepts cross-origin handshakes", "websocket", "low", HARDENING,
                  "WebSocket upgrade accepted from a foreign Origin at: " + ", ".join(a["path"] for a in acc),
                  "If the socket relies on cookies, any website can open an authenticated socket as the user (CSWSH).",
                  "Validate the Origin header during the WebSocket handshake.", [ev.id], cwe_ids=["CWE-1385"])]


def _cache(ev: EvidenceView, asset: str) -> List[Draft]:
    d = ev.data
    if d.get("served_from_cache_to_clean_request"):
        return [Draft("SEC_VULN_CACHE_POISONING", "Web cache poisoning via X-Forwarded-Host", "cache", "high", VULNERABILITY,
                      f"A value sent in X-Forwarded-Host was reflected and then served from cache to a request without the header ({d.get('probe_url')}).",
                      "An attacker can make the cache serve malicious content or redirects to every visitor of a page.",
                      "Do not use X-Forwarded-Host for URL generation, or include it in the cache key.", [ev.id],
                      references=["https://portswigger.net/web-security/web-cache-poisoning"])]
    if d.get("reflected"):
        return [Draft("SEC_HOST_HEADER_REFLECTION", "X-Forwarded-Host header reflected in response", "cache", "low", HARDENING,
                      "The X-Forwarded-Host value was reflected in the response (not served from cache in this test).",
                      "Header reflection can enable password-reset poisoning or cache poisoning behind some proxies.",
                      "Build absolute URLs from a configured hostname, not request headers.", [ev.id])]
    return []


def _sri(ev: EvidenceView, asset: str) -> List[Draft]:
    missing = ev.data.get("missing_integrity", [])
    if not missing:
        return []
    return [Draft("SEC_SRI_MISSING", f"{len(missing)} third-party script(s) loaded without Subresource Integrity", "headers", "low", HARDENING,
                  "Scripts without integrity attribute: " + ", ".join(missing[:5]),
                  "If the third-party host is compromised, modified scripts run in your users' browsers (supply-chain attack).",
                  "Add integrity='sha384-…' and crossorigin='anonymous' to third-party script tags.", [ev.id],
                  references=["https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity"])]


def _fingerprint(ev: EvidenceView, asset: str) -> List[Draft]:
    comps = ev.data.get("components", [])
    disclosed = [c for c in comps if c.get("version") and str(c.get("source", "")).startswith("http.header")]
    out = []
    if disclosed:
        items = "; ".join(c["evidence"] for c in disclosed[:4])
        out.append(Draft("SEC_VERSION_DISCLOSURE", "Software versions disclosed in HTTP headers", "inventory", "informational", INVENTORY,
                         f"Response headers reveal exact versions: {items}.",
                         "Exact versions let attackers look up matching exploits directly (matched CVEs are reported separately).",
                         "Remove version numbers from Server / X-Powered-By headers (e.g. 'ServerTokens Prod', 'server_tokens off', expose_php=Off).",
                         [ev.id]))
    if comps:
        listing = ", ".join(f"{c['name']} {c['version']}".strip() if c.get("version") else c["name"] for c in comps[:20])
        out.append(Draft("INV_TECHNOLOGY_STACK", "Technology stack identified", "inventory", "informational", INVENTORY,
                         f"Detected: {listing}.", "Used to match known vulnerabilities against NVD and OSV.",
                         "Keep every listed component on a supported, patched version.", [ev.id]))
    return out


def _whois(ev: EvidenceView, asset: str) -> List[Draft]:
    if (ev.data.get("dnssec") or "").startswith("unsigned"):
        return [Draft("INV_DNSSEC_UNSIGNED", "DNSSEC not enabled", "inventory", "informational", INVENTORY,
                      f"The registry reports DNSSEC as '{ev.data.get('dnssec')}' for {ev.data.get('domain')}.",
                      "DNS answers for this domain cannot be cryptographically validated by resolvers.",
                      "Consider enabling DNSSEC at your registrar and DNS provider.", [ev.id])]
    return []


def _nuclei(ev: EvidenceView, asset: str) -> List[Draft]:
    out = []
    for r in ev.data.get("results", []):
        sev = r.get("severity") if r.get("severity") in SEVERITY_RANK else "medium"
        tags = r.get("tags") or []
        tags = tags if isinstance(tags, list) else str(tags).split(",")
        cls = HARDENING if ("misconfig" in tags and sev in ("low", "informational") and not r.get("cve_ids")) else VULNERABILITY
        score = r.get("cvss_score")
        try:
            score = float(score) if score is not None else None
        except (TypeError, ValueError):
            score = None
        title = r.get("name") or r.get("template_id")
        if r.get("cve_ids") and r["cve_ids"][0] not in title:
            title = f"{r['cve_ids'][0]}: {title}"
        out.append(Draft(
            key=f"NUCLEI:{r.get('template_id')}:{r.get('matched_at')}"[:150],
            title=title[:250], category="cve" if r.get("cve_ids") else "nuclei", severity=sev, finding_class=cls,
            description=(r.get("description") or title) + f"\n\nVerified at {r.get('matched_at')} by Nuclei template '{r.get('template_id')}'"
                        + (f" (matcher: {r.get('matcher_name')})" if r.get("matcher_name") else "") + ".",
            impact=describe_exploitability(r.get("cvss_vector")) or "Verified by an active, non-destructive check against the target.",
            remediation=r.get("remediation") or "Apply the vendor fix for this issue; see references.",
            evidence_ids=[ev.id], confidence="confirmed", source="nuclei",
            references=r.get("references") or [], cve_ids=r.get("cve_ids") or [], cwe_ids=r.get("cwe_ids") or [],
            cvss_score=score, cvss_vector=r.get("cvss_vector"),
        ))
    return out


RULES = {
    "fingerprint.technology": _fingerprint,
    "http.security_headers": _headers,
    "http.cookies": _cookies,
    "tls.configuration": _tls,
    "vuln.cors": _cors,
    "vuln.sensitive_files": _sensitive_files,
    "dns.email_security": _email,
    "vuln.error_disclosure": _errors,
    "vuln.directory_listing": _listing,
    "vuln.admin_interfaces": _admin,
    "vuln.api_exposure": _api,
    "vuln.open_redirect": _redirect,
    "vuln.http_methods": _methods,
    "vuln.subdomain_takeover": _takeover,
    "network.service_scan": _services,
    "vuln.websocket_origin": _websocket,
    "vuln.cache_poisoning": _cache,
    "http.subresource_integrity": _sri,
    "osint.whois": _whois,
    "vuln.nuclei": _nuclei,
}


def derive_check_findings(evidence: Iterable[EvidenceView], asset: str) -> List[Draft]:
    drafts: List[Draft] = []
    for ev in evidence:
        rule = RULES.get(ev.type)
        if rule and isinstance(ev.data, dict) and not ev.data.get("skipped"):
            drafts.extend(rule(ev, asset))
    return drafts


# ───────────────────────────── components & intel ─────────────────────────────

def components_from_evidence(evidence: Iterable[EvidenceView]) -> List[DetectedComponent]:
    out: List[DetectedComponent] = []
    for ev in evidence:
        if ev.type not in ("fingerprint.technology", "network.service_scan"):
            continue
        for c in ev.data.get("components", []) or []:
            if c.get("kind") in ("platform", "technology") and not c.get("ecosystem"):
                continue
            key = catalog.lookup_cpe(c.get("cpe") or "") or catalog.lookup(c.get("name") or "")
            out.append(DetectedComponent(
                name=c.get("name") or "", version=c.get("version"), catalog_key=None if c.get("ecosystem") else key,
                ecosystem=c.get("ecosystem"), package=c.get("package"), source=c.get("source") or "",
                evidence=c.get("evidence") or "", location=c.get("location") or "",
                backport_risk=bool(c.get("backport_risk")), evidence_id=ev.id,
            ))
    return out


def drafts_from_matches(matches: List[VulnMatch], asset: str) -> List[Draft]:
    drafts = []
    for m in matches:
        comp = m.component
        fixed = ", ".join(m.fixed_versions[:3])
        remediation = (f"Upgrade {comp.display.rsplit(' ', 1)[0]} to {fixed} or later." if fixed
                       else f"Upgrade {comp.display.rsplit(' ', 1)[0]} to the latest supported release, or apply the vendor patch.")
        notes = []
        if comp.backport_risk:
            notes.append("The banner indicates a distribution package; distributions often backport fixes without changing the "
                         "version number, so confirm against the distribution's security tracker.")
        if m.platform:
            notes.append("NVD lists this CVE only in combination with: " + ", ".join(m.platform) + ".")
        description = (f"{m.description}\n\nDetected {comp.display} on {asset} ({comp.evidence}). "
                       f"{'NVD' if m.source == 'nvd' else 'OSV'} lists this version as affected." + (" " + " ".join(notes) if notes else ""))
        impact = describe_exploitability(m.cvss_vector) or (f"CVSS {m.cvss_score}." if m.cvss_score else "Severity per vendor advisory.")
        drafts.append(Draft(
            key=f"{m.source.upper()}:{m.vuln_id}:{comp.catalog_key or comp.package}"[:150],
            title=m.title[:250], category="cve", severity=m.severity or severity_from_score(m.cvss_score),
            finding_class=VULNERABILITY, description=description, impact=impact, remediation=remediation,
            evidence_ids=[comp.evidence_id] if comp.evidence_id else [], confidence="likely", source=m.source,
            references=m.references, component=comp.display[:250], cve_ids=m.cve_ids, cwe_ids=m.cwes,
            cvss_score=m.cvss_score, cvss_vector=m.cvss_vector,
        ))
    return drafts


def merge_verifications(drafts: List[Draft]) -> List[Draft]:
    """A database match verified by Nuclei becomes one confirmed finding."""
    by_cve: Dict[str, Draft] = {}
    for d in drafts:
        if d.source in ("nvd", "osv"):
            for c in d.cve_ids:
                by_cve.setdefault(c, d)
    merged = []
    for d in drafts:
        if d.source == "nuclei" and d.cve_ids and any(c in by_cve for c in d.cve_ids):
            target = by_cve[next(c for c in d.cve_ids if c in by_cve)]
            target.confidence = "confirmed"
            target.source = f"{target.source}+nuclei"
            target.evidence_ids = list(dict.fromkeys(target.evidence_ids + d.evidence_ids))
            target.description += f"\n\nActively verified: {d.description.split('Verified at', 1)[-1].strip()}"
            continue
        merged.append(d)
    return merged


def apply_exploitation(drafts: List[Draft], context: Dict[str, Dict]) -> None:
    for d in drafts:
        best_epss: Optional[Tuple[float, float]] = None
        for cve in d.cve_ids:
            info = context.get(cve) or {}
            kev = info.get("kev")
            if kev and not d.is_kev:
                d.is_kev = True
                d.impact = (f"Listed in CISA Known Exploited Vulnerabilities (added {kev.get('date_added')}"
                            + (", used in ransomware campaigns" if kev.get("ransomware") == "Known" else "") + "). " + d.impact)
                d.references = list(dict.fromkeys(d.references + ["https://www.cisa.gov/known-exploited-vulnerabilities-catalog"]))
            if info.get("epss") and (best_epss is None or info["epss"][0] > best_epss[0]):
                best_epss = info["epss"]
        if best_epss:
            d.epss_score, d.epss_percentile = best_epss


def dedupe(drafts: List[Draft]) -> List[Draft]:
    seen: Dict[str, Draft] = {}
    for d in drafts:
        if d.key in seen:
            seen[d.key].evidence_ids = list(dict.fromkeys(seen[d.key].evidence_ids + d.evidence_ids))
        else:
            seen[d.key] = d
    return list(seen.values())


def sort_key(d) -> tuple:
    """Risk order: class, severity, known-exploited first, confirmed before likely, then EPSS and CVSS."""
    cls_rank = {VULNERABILITY: 0, HARDENING: 1, INVENTORY: 2}
    return (cls_rank.get(d.finding_class, 3), SEVERITY_RANK.get(d.severity, 5), not d.is_kev,
            d.confidence != "confirmed", -(d.epss_score or 0), -(d.cvss_score or 0), d.title)
