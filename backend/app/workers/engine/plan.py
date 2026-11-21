"""
Fixed, ordered check plans per preset.

Normal ⊂ Moderate ⊂ Ultimate by construction: a check enabled for a preset
is enabled for every deeper preset, and deeper presets only increase a
check's depth options. The same target + preset always runs the same checks
in the same order.
"""
from typing import Dict, List, NamedTuple, Optional

PRESETS = ("normal", "moderate", "ultimate")
RANK = {p: i for i, p in enumerate(PRESETS)}


class CheckSpec(NamedTuple):
    check_id: str
    title: str
    category: str
    min_preset: str
    min_seconds: float  # skipped (recorded) when less budget than this remains
    options: Optional[Dict[str, dict]] = None  # per-preset options; missing preset inherits the shallower one


CHECKS: List[CheckSpec] = [
    CheckSpec("engine.baseline", "Not-found baseline & catch-all detection", "engine", "normal", 3),
    CheckSpec("fingerprint.technology", "Technology & version fingerprinting", "fingerprint", "normal", 5,
              {"normal": {"scripts": 0}, "moderate": {"scripts": 8}, "ultimate": {"scripts": 25}}),
    CheckSpec("http.security_headers", "HTTP security headers", "headers", "normal", 1),
    CheckSpec("http.cookies", "Cookie security flags", "cookies", "normal", 2),
    CheckSpec("tls.configuration", "TLS certificate & protocol configuration", "tls", "normal", 8),
    CheckSpec("vuln.cors", "CORS origin reflection", "vuln", "normal", 3),
    CheckSpec("vuln.sensitive_files", "Sensitive file & secret exposure", "vuln", "normal", 8,
              {"normal": {"depth": "core"}, "moderate": {"depth": "full"}}),
    CheckSpec("dns.email_security", "Email spoofing protection (SPF / DMARC)", "dns", "normal", 5),
    CheckSpec("vuln.error_disclosure", "Error & debug information disclosure", "vuln", "moderate", 5),
    CheckSpec("vuln.directory_listing", "Directory listing", "vuln", "moderate", 6),
    CheckSpec("vuln.admin_interfaces", "Admin & management interface discovery", "vuln", "moderate", 6),
    CheckSpec("vuln.api_exposure", "API schema & GraphQL introspection exposure", "vuln", "moderate", 5),
    CheckSpec("vuln.open_redirect", "Open redirect", "vuln", "moderate", 10),
    CheckSpec("vuln.http_methods", "HTTP methods & TRACE", "vuln", "moderate", 3),
    CheckSpec("vuln.subdomain_takeover", "Subdomain takeover", "dns", "moderate", 4),
    CheckSpec("network.service_scan", "Service & version scan (nmap -sV)", "network", "moderate", 30,
              {"moderate": {"top_ports": 100, "timeout": 90}, "ultimate": {"top_ports": 1000, "timeout": 180}}),
    CheckSpec("vuln.websocket_origin", "WebSocket cross-origin handshake", "vuln", "ultimate", 5),
    CheckSpec("vuln.cache_poisoning", "Web cache poisoning (unkeyed header)", "vuln", "ultimate", 4),
    CheckSpec("http.subresource_integrity", "Subresource Integrity on third-party scripts", "headers", "ultimate", 1),
    CheckSpec("osint.security_policy", "security.txt & robots.txt", "osint", "ultimate", 3),
    CheckSpec("osint.whois", "Domain registration (WHOIS)", "osint", "ultimate", 8),
    # Always last: uses whatever budget remains.
    CheckSpec("vuln.nuclei", "Active CVE & misconfiguration verification (Nuclei)", "vuln", "moderate", 45,
              {"moderate": {"profile": "moderate"}, "ultimate": {"profile": "ultimate"}}),
]


def resolve_options(spec: CheckSpec, preset: str) -> dict:
    if not spec.options:
        return {}
    chosen: dict = {}
    for p in PRESETS[: RANK[preset] + 1]:
        if p in spec.options:
            chosen = spec.options[p]
    return dict(chosen)


def build_plan(preset: str) -> List[Dict[str, object]]:
    preset = preset if preset in RANK else "normal"
    plan = []
    for spec in CHECKS:
        if RANK[spec.min_preset] <= RANK[preset]:
            plan.append({
                "check_id": spec.check_id,
                "title": spec.title,
                "category": spec.category,
                "min_seconds": spec.min_seconds,
                "options": resolve_options(spec, preset),
            })
    return plan
