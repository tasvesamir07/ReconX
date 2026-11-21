"""
Deterministic security checks.

Each check returns (normalized_data, summary). Checks never write, modify or
delete anything on the target, and every request is pinned to the authorized
host by HttpClient.

Path-based checks compare responses against a "not found" baseline so that
sites returning the same page for every URL (single-page apps, catch-all
routes) cannot produce exposure findings.
"""
import difflib
import json
import os
import re
import secrets
import shutil
import socket
import ssl
import subprocess
import time
import urllib.parse
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

from . import fingerprint as fp
from .http import HttpClient, Response, ScopeError

PROBE_ORIGIN = "https://reconx-cors-probe.example"
REDIRECT_PROBE_HOST = "reconx-redirect-probe.example"
CACHE_PROBE_HOST = "reconx-cache-probe.example"

_TWO_LEVEL_SUFFIXES = {
    "co.uk", "org.uk", "ac.uk", "gov.uk", "com.au", "net.au", "org.au", "co.nz", "co.jp", "co.in",
    "com.bd", "net.bd", "org.bd", "com.br", "com.sg", "com.my", "com.pk", "com.tr", "co.za", "com.mx",
}


# ───────────────────────────── shared context ─────────────────────────────

class Context:
    def __init__(self, target_url: str, canonical_host: str, resolved_ip: str, preset: str,
                 http: HttpClient, tools: Dict[str, Optional[str]], deadline: float, job_dir: str = "."):
        self.target_url = target_url
        parsed = urllib.parse.urlsplit(target_url)
        self.scheme = parsed.scheme or "https"
        self.origin = f"{self.scheme}://{parsed.netloc}"
        self.canonical_host = canonical_host
        self.resolved_ip = resolved_ip
        self.preset = preset
        self.http = http
        self.tools = tools
        self.deadline = deadline
        self.job_dir = job_dir
        self.homepage: Optional[Response] = None
        self.not_found: List[Response] = []
        self.catch_all = False
        self.cdn: Optional[str] = None
        self.components: List[Dict[str, object]] = []
        self.login_paths: List[str] = []

    def remaining(self) -> float:
        return self.deadline - time.monotonic()

    def url(self, path: str) -> str:
        return self.origin + (path if path.startswith("/") else "/" + path)

    def home(self) -> Response:
        if self.homepage is None:
            self.homepage = self.http.get(self.target_url, follow_redirects=True)
        return self.homepage

    def is_not_found(self, resp: Response) -> bool:
        """True when a probe response is indistinguishable from 'nothing here'."""
        if resp.status is None or resp.status in (404, 410) or 300 <= resp.status < 400:
            return True
        for nf in self.not_found:
            if nf.status == resp.status and similarity(nf.body, resp.body) >= 0.85:
                return True
        home = self.homepage
        if home is not None and home.status == resp.status and similarity(home.body, resp.body) >= 0.9:
            return True
        return False


def find_tool(name: str, configured: Optional[str] = None) -> Optional[str]:
    if configured and os.path.isfile(configured):
        return configured
    found = shutil.which(name)
    if found:
        return found
    for d in ("/usr/bin", "/usr/local/bin", os.path.expanduser("~/go/bin"), os.path.expanduser("~/.local/bin")):
        p = os.path.join(d, name)
        if os.path.isfile(p) and os.access(p, os.X_OK):
            return p
    return None


def run_tool(args: List[str], timeout: float, input_bytes: Optional[bytes] = None) -> Tuple[Optional[int], str, str, Optional[str]]:
    try:
        p = subprocess.run(args, capture_output=True, timeout=max(1.0, timeout), input=input_bytes)
        return p.returncode, p.stdout.decode("utf-8", "replace"), p.stderr.decode("utf-8", "replace"), None
    except subprocess.TimeoutExpired as e:
        out = (e.stdout or b"").decode("utf-8", "replace") if isinstance(e.stdout, bytes) else (e.stdout or "")
        return None, out, "", "timeout"
    except (OSError, ValueError) as e:
        return None, "", "", str(e)


_NOISE_RE = re.compile(rb"[0-9a-f]{8,}|\d+|\s+", re.I)


def similarity(a: bytes, b: bytes) -> float:
    """Content similarity after removing volatile tokens (nonces, ids, timestamps)."""
    na, nb = _NOISE_RE.sub(b"", (a or b"")[:30000]), _NOISE_RE.sub(b"", (b or b"")[:30000])
    if not na and not nb:
        return 1.0
    if not na or not nb:
        return 0.0
    ratio = min(len(na), len(nb)) / max(len(na), len(nb))
    if ratio < 0.5:
        return ratio
    sm = difflib.SequenceMatcher(None, na[:3000], nb[:3000], autojunk=False)
    if sm.quick_ratio() < 0.85:
        return sm.quick_ratio()
    return sm.ratio()


def redact(text: str, max_len: int = 240) -> str:
    """Masks values in key=value / key: value lines so secrets are never stored."""
    lines = []
    for line in (text or "").splitlines()[:6]:
        m = re.match(r"^\s*([A-Za-z0-9_.\-]+)\s*[=:]\s*\S", line)
        lines.append(f"{m.group(1)}=<redacted>" if m else line[:120])
    return "\n".join(lines)[:max_len]


def org_domain(host: str) -> str:
    labels = host.lower().strip(".").split(".")
    if len(labels) >= 3 and ".".join(labels[-2:]) in _TWO_LEVEL_SUFFIXES:
        return ".".join(labels[-3:])
    return ".".join(labels[-2:])


def _title(html: str) -> Optional[str]:
    m = re.search(r"<title[^>]*>(.*?)</title>", html or "", re.I | re.S)
    return re.sub(r"\s+", " ", m.group(1)).strip()[:120] if m else None


def _get(ctx: Context, path_or_url: str, **kw) -> Response:
    url = path_or_url if path_or_url.startswith("http") else ctx.url(path_or_url)
    try:
        return ctx.http.get(url, **kw)
    except ScopeError as e:
        r = Response(url, "GET")
        r.error = str(e)
        return r


# ───────────────────────────── checks ─────────────────────────────

def check_baseline(ctx: Context, opts: dict) -> Tuple[dict, str]:
    home = ctx.home()
    token = secrets.token_hex(6)
    samples = []
    for path in (f"/rx-{token}-nf.html", f"/rx-{token}/", f"/rx-{token}.php"):
        r = _get(ctx, path)
        ctx.not_found.append(r)
        samples.append({"path": path, "status": r.status, "length": len(r.body), "location": r.header("location")})
    ctx.catch_all = any(s["status"] == 200 for s in samples)
    hdrs = home.header_map()
    ctx.cdn = fp.detect_cdn(hdrs)
    data = {
        "homepage": {
            "requested": ctx.target_url, "final_url": home.final_url, "status": home.status,
            "length": len(home.body), "title": _title(home.text), "error": home.error,
            "redirects": [u for _, u in home.redirect_chain], "off_scope_redirect": home.off_scope_redirect,
        },
        "not_found_samples": samples,
        "catch_all": ctx.catch_all,
        "cdn": ctx.cdn,
    }
    mode = "catch-all routing (every path returns 200)" if ctx.catch_all else "standard 404 handling"
    return data, f"Homepage HTTP {home.status}; {mode}; CDN: {ctx.cdn or 'none detected'}"


def check_fingerprint(ctx: Context, opts: dict) -> Tuple[dict, str]:
    home = ctx.home()
    hdrs = home.header_map()
    html = home.text
    comps: List[Dict[str, object]] = []
    for header in ("server", "x-powered-by", "x-aspnet-version", "x-aspnetmvc-version", "x-generator", "x-drupal-cache", "x-runtime"):
        value = hdrs.get(header)
        if not value:
            continue
        if header in ("x-aspnet-version", "x-aspnetmvc-version"):
            comps.append(fp._component(name="ASP.NET" if header == "x-aspnet-version" else "ASP.NET MVC",
                                       version=fp.clean_version(value)[0], source=f"http.header.{header}",
                                       evidence=f"{header}: {value}", location=home.final_url))
        elif header == "x-generator":
            comps.extend(fp.parse_generator(f'<meta name="generator" content="{value}">', home.final_url))
        elif header in ("server", "x-powered-by"):
            comps.extend(fp.parse_product_header(value, header, home.final_url))
    comps.extend(fp.parse_generator(html, home.final_url))
    comps.extend(fp.parse_wordpress_core(html, home.final_url))
    comps.extend(fp.technologies(html, hdrs, home.headers_all("set-cookie")))

    scripts = [urllib.parse.urljoin(home.final_url, s) for s in fp.script_urls(html)]
    styles = [urllib.parse.urljoin(home.final_url, s) for s in fp.stylesheet_urls(html)]
    for url in scripts + styles:
        lib = fp.library_from_url(url)
        if lib:
            comps.append(lib)

    examined = 0
    limit = int(opts.get("scripts", 0))
    for url in scripts:
        if examined >= limit or ctx.remaining() < 20:
            break
        if not ctx.http.in_scope(url):
            continue
        r = ctx.http.get(url, max_body=400 * 1024)
        examined += 1
        if r.status == 200:
            comps.extend(fp.libraries_from_script(r.text, url))

    ctx.components = fp.dedupe(ctx.components + comps)
    versioned = [c for c in ctx.components if c.get("version")]
    data = {
        "components": ctx.components,
        "cdn": ctx.cdn,
        "scripts_referenced": len(scripts),
        "scripts_examined": examined,
        "response_headers": {k: v for k, v in hdrs.items() if k in ("server", "x-powered-by", "x-generator", "via", "x-aspnet-version")},
    }
    names = ", ".join(f"{c['name']} {c['version']}" for c in versioned[:6]) or "none"
    return data, f"{len(versioned)} versioned component(s): {names}; {len(ctx.components) - len(versioned)} other technologies"


def check_security_headers(ctx: Context, opts: dict) -> Tuple[dict, str]:
    home = ctx.home()
    if home.status is None:
        raise RuntimeError(f"Homepage unreachable: {home.error}")
    h = home.header_map()
    https = home.final_url.startswith("https://")
    csp = h.get("content-security-policy", "")
    missing, weak = [], []
    if https and "strict-transport-security" not in h:
        missing.append("Strict-Transport-Security")
    if not csp:
        missing.append("Content-Security-Policy")
    if "x-frame-options" not in h and "frame-ancestors" not in csp:
        missing.append("X-Frame-Options")
    if (h.get("x-content-type-options") or "").lower() != "nosniff":
        missing.append("X-Content-Type-Options")
    if "referrer-policy" not in h:
        missing.append("Referrer-Policy")
    hsts = h.get("strict-transport-security", "")
    m = re.search(r"max-age\s*=\s*(\d+)", hsts)
    if hsts and (not m or int(m.group(1)) < 15552000):
        weak.append({"header": "Strict-Transport-Security", "issue": f"max-age below 180 days ({m.group(1) if m else 'missing'})"})
    if csp:
        script_src = re.search(r"script-src([^;]*)", csp)
        directive = script_src.group(1) if script_src else (re.search(r"default-src([^;]*)", csp) or [None, ""])[1]
        if directive and "'unsafe-inline'" in directive and "nonce-" not in directive and "sha256-" not in directive:
            weak.append({"header": "Content-Security-Policy", "issue": "script-src allows 'unsafe-inline' without nonces or hashes"})
    present = {k: v[:300] for k, v in h.items() if k in (
        "strict-transport-security", "content-security-policy", "x-frame-options", "x-content-type-options",
        "referrer-policy", "permissions-policy", "cross-origin-opener-policy")}
    data = {"url": home.final_url, "status": home.status, "https": https, "present": present, "missing": missing, "weak": weak}
    return data, f"Missing: {', '.join(missing) or 'none'}; weak: {len(weak)}"


_SESSION_COOKIE_RE = re.compile(r"sess|sid$|^sid|token|auth|jwt|login|remember|connect\.sid|phpsessid|jsessionid|asp\.net_sessionid|laravel_session", re.I)


def _parse_cookie(raw: str) -> dict:
    parts = [p.strip() for p in raw.split(";")]
    name = parts[0].split("=", 1)[0].strip()
    attrs = {}
    for a in parts[1:]:
        k, _, v = a.partition("=")
        attrs[k.strip().lower()] = v.strip()
    return {
        "name": name,
        "secure": "secure" in attrs,
        "httponly": "httponly" in attrs,
        "samesite": attrs.get("samesite"),
        "session_like": bool(_SESSION_COOKIE_RE.search(name)),
    }


def check_cookies(ctx: Context, opts: dict) -> Tuple[dict, str]:
    first = _get(ctx, ctx.target_url)  # first hop, so cookies set on a redirect are seen
    home = ctx.home()
    raw = first.headers_all("set-cookie") + [c for c in home.headers_all("set-cookie") if c not in first.headers_all("set-cookie")]
    cookies = [_parse_cookie(c) for c in raw]
    https = home.final_url.startswith("https://")
    issues = []
    for c in cookies:
        if https and not c["secure"]:
            issues.append({"cookie": c["name"], "issue": "missing Secure"})
        if c["session_like"] and not c["httponly"]:
            issues.append({"cookie": c["name"], "issue": "session cookie missing HttpOnly"})
        if (c["samesite"] or "").lower() == "none" and not c["secure"]:
            issues.append({"cookie": c["name"], "issue": "SameSite=None without Secure"})
    data = {"https": https, "cookies": cookies, "issues": issues}
    return data, f"{len(cookies)} cookie(s), {len(issues)} flag issue(s)"


def _tls_probe_python(host: str, port: int, version_name: str) -> Tuple[Optional[bool], str]:
    tv = {"TLSv1.0": ssl.TLSVersion.TLSv1, "TLSv1.1": ssl.TLSVersion.TLSv1_1}[version_name]
    try:
        c = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        c.check_hostname = False
        c.verify_mode = ssl.CERT_NONE
        c.minimum_version = tv
        c.maximum_version = tv
        try:
            c.set_ciphers("DEFAULT:@SECLEVEL=0")
        except ssl.SSLError:
            pass
    except (ValueError, ssl.SSLError) as e:
        return None, f"local TLS library cannot test {version_name}: {e}"
    try:
        with socket.create_connection((host, port), timeout=6) as s:
            with c.wrap_socket(s, server_hostname=host) as ss:
                return True, f"negotiated {ss.version()} {ss.cipher()[0] if ss.cipher() else ''}"
    except ssl.SSLError as e:
        msg = str(e).lower()
        if "no protocols available" in msg or "no ciphers available" in msg or "no cipher match" in msg:
            return None, f"local TLS library cannot test {version_name}"
        return False, f"rejected ({str(e)[:80]})"
    except (socket.timeout, TimeoutError):
        return None, "timeout"
    except OSError as e:
        return False, f"connection closed ({str(e)[:60]})"


def _tls_probe_openssl(openssl: str, host: str, port: int, version_name: str) -> Tuple[Optional[bool], str]:
    flag = {"TLSv1.0": "-tls1", "TLSv1.1": "-tls1_1"}[version_name]
    code, out, err, e = run_tool([openssl, "s_client", "-connect", f"{host}:{port}", "-servername", host, flag,
                                  "-cipher", "DEFAULT@SECLEVEL=0"], timeout=8, input_bytes=b"")
    text = (out + err).lower()
    if e or "unknown option" in text or "no protocols available" in text:
        return None, "openssl client cannot test this protocol"
    if re.search(r"protocol\s*:\s*tlsv1(\.1)?\b", text) or "new, tlsv1" in text:
        return True, "negotiated via openssl s_client"
    return False, "rejected"


def check_tls(ctx: Context, opts: dict) -> Tuple[dict, str]:
    host = ctx.canonical_host
    port = urllib.parse.urlsplit(ctx.target_url).port or 443
    data: Dict[str, object] = {"host": host, "port": port, "https_target": ctx.scheme == "https"}
    try:
        verified = ssl.create_default_context()
        with socket.create_connection((host, port), timeout=6) as s:
            with verified.wrap_socket(s, server_hostname=host) as ss:
                cert = ss.getpeercert() or {}
                data.update({"tls_version": ss.version(), "cipher": (ss.cipher() or [None])[0], "cert_valid": True})
                not_after = cert.get("notAfter")
                if not_after:
                    exp = datetime.strptime(not_after, "%b %d %H:%M:%S %Y %Z").replace(tzinfo=timezone.utc)
                    data["expires"] = exp.isoformat()
                    data["days_remaining"] = (exp - datetime.now(timezone.utc)).days
                data["issuer"] = ", ".join("=".join(x) for rdn in cert.get("issuer", ()) for x in rdn)[:200]
                data["subject_alt_names"] = [v for k, v in cert.get("subjectAltName", ()) if k == "DNS"][:50]
    except ssl.SSLCertVerificationError as e:
        data.update({"cert_valid": False, "cert_error": getattr(e, "verify_message", str(e))[:200]})
    except (ssl.SSLError, OSError) as e:
        data.update({"cert_valid": None, "handshake_error": str(e)[:200]})

    legacy = {}
    for name in ("TLSv1.0", "TLSv1.1"):
        result, note = _tls_probe_python(host, port, name)
        if result is None and ctx.tools.get("openssl"):
            result, note = _tls_probe_openssl(ctx.tools["openssl"], host, port, name)
        legacy[name] = {"supported": result, "note": note}
    data["legacy_protocols"] = legacy

    if ctx.scheme == "https":
        r = _get(ctx, f"http://{urllib.parse.urlsplit(ctx.target_url).netloc}/")
        loc = (r.header("location") or "")
        data["http_to_https"] = None if r.status is None else (r.status in (301, 302, 307, 308) and loc.startswith("https://"))
        data["http_status"] = r.status
    enabled = [k for k, v in legacy.items() if v["supported"]]
    return data, f"{data.get('tls_version') or 'handshake failed'}; certificate valid: {data.get('cert_valid')}; legacy enabled: {', '.join(enabled) or 'none'}"


def check_cors(ctx: Context, opts: dict) -> Tuple[dict, str]:
    url = ctx.home().final_url
    results = []
    for origin in (PROBE_ORIGIN, "null"):
        r = _get(ctx, url, headers={"Origin": origin})
        acao = r.header("access-control-allow-origin")
        acac = (r.header("access-control-allow-credentials") or "").lower() == "true"
        results.append({"origin_sent": origin, "status": r.status, "allow_origin": acao, "allow_credentials": acac,
                        "reflected": acao == origin, "wildcard": acao == "*"})
    vulnerable = [x for x in results if x["reflected"] and x["allow_credentials"]]
    reflected = [x for x in results if x["reflected"]]
    data = {"url": url, "tests": results, "credentialed_reflection": bool(vulnerable), "reflection": bool(reflected),
            "wildcard": any(x["wildcard"] for x in results)}
    state = "credentialed origin reflection" if vulnerable else ("origin reflected" if reflected else "no reflection")
    return data, f"CORS: {state}"


# (path, signature-check, severity, title, depth, redact)
def _sig_git_head(body: bytes, ctx: Context) -> Optional[str]:
    text = body[:200].decode("utf-8", "replace").strip()
    if text.startswith("ref: refs/") or re.fullmatch(r"[0-9a-f]{40}", text):
        cfg = _get(ctx, "/.git/config", max_body=8192)
        if cfg.status == 200 and b"[core]" in cfg.body:
            return f"{text[:60]} (and /.git/config readable)"
        return text[:60]
    return None


def _sig_env(body: bytes, ctx) -> Optional[str]:
    text = body[:8192].decode("utf-8", "replace")
    if "<html" in text.lower():
        return None
    lines = [l for l in text.splitlines() if re.match(r"^\s*[A-Z][A-Z0-9_]{1,}\s*=", l)]
    return redact("\n".join(lines)) if len(lines) >= 2 else None


def _sig_contains(*needles: str, all_of: bool = False):
    def check(body: bytes, ctx) -> Optional[str]:
        text = body[:65536].decode("utf-8", "replace")
        hits = [n for n in needles if n in text]
        ok = len(hits) == len(needles) if all_of else bool(hits)
        return f"contains '{hits[0]}'" if ok else None
    return check


def _sig_magic(magic: bytes, label: str):
    def check(body: bytes, ctx) -> Optional[str]:
        return f"{label} file signature" if body.startswith(magic) else None
    return check


def _sig_sql(body: bytes, ctx) -> Optional[str]:
    text = body[:65536].decode("utf-8", "replace")
    if "<html" in text.lower():
        return None
    return "SQL dump statements present" if re.search(r"\b(CREATE TABLE|INSERT INTO)\b", text) else None


def _sig_htpasswd(body: bytes, ctx) -> Optional[str]:
    text = body[:4096].decode("utf-8", "replace")
    if "<html" in text.lower():
        return None
    return "user:hash entries present" if re.search(r"^[^:\s]+:(\$apr1\$|\$2[aby]\$|\{SHA\}|[./0-9A-Za-z]{13}$)", text, re.M) else None


def _sig_actuator_env(body: bytes, ctx) -> Optional[str]:
    try:
        doc = json.loads(body[:200000].decode("utf-8", "replace"))
    except ValueError:
        return None
    return "Spring Boot environment JSON (propertySources)" if isinstance(doc, dict) and "propertySources" in doc else None


SENSITIVE_PATHS = [
    ("/.git/HEAD", _sig_git_head, "critical", "Git repository exposed", "core", False),
    ("/.env", _sig_env, "critical", "Environment file with configuration secrets exposed", "core", True),
    ("/.aws/credentials", _sig_contains("aws_access_key_id"), "critical", "AWS credentials file exposed", "core", True),
    ("/.htpasswd", _sig_htpasswd, "high", "Password file (.htpasswd) exposed", "core", True),
    ("/server-status", _sig_contains("Apache Server Status for"), "medium", "Apache server-status page exposed", "core", False),
    ("/server-info", _sig_contains("Apache Server Information"), "medium", "Apache server-info page exposed", "full", False),
    ("/phpinfo.php", _sig_contains("phpinfo()", "PHP Version", all_of=True), "medium", "phpinfo() page exposed", "core", False),
    ("/info.php", _sig_contains("phpinfo()", "PHP Version", all_of=True), "medium", "phpinfo() page exposed", "full", False),
    ("/backup.zip", _sig_magic(b"PK\x03\x04", "ZIP"), "high", "Backup archive downloadable", "core", False),
    ("/backup.tar.gz", _sig_magic(b"\x1f\x8b", "GZIP"), "high", "Backup archive downloadable", "full", False),
    ("/site.zip", _sig_magic(b"PK\x03\x04", "ZIP"), "high", "Backup archive downloadable", "full", False),
    ("/www.zip", _sig_magic(b"PK\x03\x04", "ZIP"), "high", "Backup archive downloadable", "full", False),
    ("/backup.sql", _sig_sql, "high", "Database dump downloadable", "core", True),
    ("/dump.sql", _sig_sql, "high", "Database dump downloadable", "full", True),
    ("/database.sql", _sig_sql, "high", "Database dump downloadable", "full", True),
    ("/wp-config.php.bak", _sig_contains("DB_PASSWORD", "<?php"), "high", "WordPress configuration backup exposed", "full", True),
    ("/wp-config.php~", _sig_contains("DB_PASSWORD", "<?php"), "high", "WordPress configuration backup exposed", "full", True),
    ("/config.php.bak", _sig_contains("<?php"), "high", "PHP source backup exposed", "full", True),
    ("/.svn/wc.db", _sig_magic(b"SQLite format 3", "SQLite"), "high", "Subversion metadata exposed", "full", False),
    ("/.DS_Store", _sig_magic(b"\x00\x00\x00\x01Bud1", "DS_Store"), "low", "macOS .DS_Store file exposed (directory listing leak)", "full", False),
    ("/actuator/env", _sig_actuator_env, "high", "Spring Boot Actuator environment endpoint exposed", "full", True),
    ("/debug/pprof/", _sig_contains("Types of profiles available"), "medium", "Go pprof debug endpoint exposed", "full", False),
    ("/_profiler/", _sig_contains("Symfony Profiler"), "medium", "Symfony profiler exposed", "full", False),
    ("/elmah.axd", _sig_contains("Error Log for"), "medium", "ELMAH error log exposed", "full", False),
    ("/trace.axd", _sig_contains("Application Trace"), "medium", "ASP.NET trace.axd exposed", "full", False),
]


def check_sensitive_files(ctx: Context, opts: dict) -> Tuple[dict, str]:
    depth = opts.get("depth", "core")
    exposed, probed = [], []
    for path, sig, severity, title, level, secret in SENSITIVE_PATHS:
        if level == "full" and depth != "full":
            continue
        r = _get(ctx, path, max_body=200 * 1024)
        probed.append({"path": path, "status": r.status, "length": len(r.body)})
        if r.status != 200 or ctx.is_not_found(r):
            continue
        detail = sig(r.body, ctx)
        if detail:
            exposed.append({"path": path, "title": title, "severity": severity, "proof": detail if secret else detail[:200],
                            "content_type": r.header("content-type"), "length": len(r.body)})
    data = {"probed": probed, "exposed": exposed, "catch_all": ctx.catch_all, "method": "content signature + not-found baseline"}
    return data, f"Probed {len(probed)} paths; {len(exposed)} confirmed exposure(s)"


_LISTING_RE = re.compile(r"<title>\s*Index of /|<h1>\s*Index of /|Directory listing for /|\[To Parent Directory\]", re.I)


def check_directory_listing(ctx: Context, opts: dict) -> Tuple[dict, str]:
    dirs = ["/uploads/", "/files/", "/backup/", "/backups/", "/images/", "/static/", "/assets/", "/docs/", "/tmp/", "/logs/"]
    home = ctx.home()
    for u in fp.script_urls(home.text) + fp.stylesheet_urls(home.text):
        full = urllib.parse.urljoin(home.final_url, u)
        if ctx.http.in_scope(full):
            d = urllib.parse.urlsplit(full).path.rsplit("/", 1)[0] + "/"
            if d != "/" and d not in dirs:
                dirs.append(d)
    listed = []
    for d in dirs[:18]:
        r = _get(ctx, d, max_body=65536)
        if r.status == 200 and _LISTING_RE.search(r.text) and "<a href" in r.text.lower() and not ctx.is_not_found(r):
            listed.append({"path": d, "proof": _title(r.text) or "directory index page"})
    return {"probed": dirs[:18], "listed": listed}, f"{len(listed)} director(ies) with listing enabled"


ADMIN_PATHS = ["/admin", "/admin/", "/administrator/", "/wp-login.php", "/wp-admin/", "/phpmyadmin/", "/pma/",
               "/adminer.php", "/manager/html", "/login", "/user/login", "/jenkins/login", "/grafana/login"]


def check_admin_interfaces(ctx: Context, opts: dict) -> Tuple[dict, str]:
    found = []
    for path in ADMIN_PATHS:
        r = _get(ctx, path, max_body=65536)
        if r.status is None:
            continue
        text = r.text
        entry = {"path": path, "status": r.status}
        if r.status == 401:
            realm = r.header("www-authenticate") or ""
            entry.update({"type": "auth_protected", "realm": realm[:120]})
            if "tomcat manager" in realm.lower():
                entry["console"] = "Apache Tomcat Manager"
            found.append(entry)
            continue
        if r.status != 200 or ctx.is_not_found(r):
            continue
        has_password = bool(re.search(r"<input[^>]+type=[\"']?password", text, re.I))
        console = None
        if "phpmyadmin" in text.lower() and has_password:
            console = "phpMyAdmin"
        elif "<title>Login - Adminer" in text or ("adminer" in text.lower() and has_password):
            console = "Adminer"
        elif "Jenkins" in text and has_password:
            console = "Jenkins"
        if has_password or console:
            entry.update({"type": "login_page", "title": _title(text), "console": console})
            found.append(entry)
            if path not in ctx.login_paths:
                ctx.login_paths.append(path)
    consoles = [f for f in found if f.get("console")]
    return {"interfaces": found, "management_consoles": consoles}, f"{len(found)} login/admin interface(s), {len(consoles)} management console(s)"


API_DOC_PATHS = ["/swagger.json", "/openapi.json", "/v2/api-docs", "/v3/api-docs", "/api-docs", "/swagger/v1/swagger.json",
                 "/api/swagger.json", "/swagger-ui.html", "/swagger-ui/", "/swagger/index.html", "/docs"]
GRAPHQL_PATHS = ["/graphql", "/api/graphql"]


def check_api_exposure(ctx: Context, opts: dict) -> Tuple[dict, str]:
    docs = []
    for path in API_DOC_PATHS:
        r = _get(ctx, path, max_body=300 * 1024)
        if r.status != 200 or ctx.is_not_found(r):
            continue
        text = r.text
        kind = None
        try:
            doc = json.loads(text)
            if isinstance(doc, dict) and ("swagger" in doc or "openapi" in doc):
                kind = f"OpenAPI {doc.get('openapi') or doc.get('swagger')} ({len(doc.get('paths', {}))} paths)"
        except ValueError:
            if "swagger-ui" in text.lower() and "<html" in text.lower():
                kind = "Swagger UI"
        if kind:
            docs.append({"path": path, "kind": kind})
    introspection = []
    query = json.dumps({"query": "query{__schema{queryType{name}}}"}).encode()
    for path in GRAPHQL_PATHS:
        try:
            r = ctx.http.request(ctx.url(path), "POST", headers={"Content-Type": "application/json"}, body=query, max_body=65536)
        except ScopeError:
            continue
        if r.status == 200 and '"__schema"' in r.text:
            introspection.append({"path": path, "proof": r.text[:120]})
    data = {"api_docs": docs, "graphql_introspection": introspection}
    return data, f"{len(docs)} API schema(s) public; GraphQL introspection on {len(introspection)} endpoint(s)"


REDIRECT_PARAMS = ["next", "url", "redirect", "redirect_uri", "redirect_url", "return", "returnTo", "return_url",
                   "continue", "dest", "destination", "goto", "r", "target"]


def check_open_redirect(ctx: Context, opts: dict) -> Tuple[dict, str]:
    bases = [urllib.parse.urlsplit(ctx.home().final_url).path or "/"] + ctx.login_paths[:3]
    payloads = [f"https://{REDIRECT_PROBE_HOST}/rx", f"//{REDIRECT_PROBE_HOST}/rx"]
    vulnerable, tested = [], 0
    for base in bases:
        for param in REDIRECT_PARAMS:
            for payload in payloads:
                if ctx.remaining() < 10:
                    break
                path = f"{base}?{urllib.parse.urlencode({param: payload})}"
                r = _get(ctx, path, max_body=4096)
                tested += 1
                loc = r.header("location") or ""
                target_host = urllib.parse.urlsplit(urllib.parse.urljoin(ctx.url(base), loc)).hostname if loc else None
                if r.status in (301, 302, 303, 307, 308) and target_host == REDIRECT_PROBE_HOST:
                    vulnerable.append({"path": base, "parameter": param, "payload": payload, "location": loc[:200], "status": r.status})
                    break
    return {"tested_requests": tested, "vulnerable": vulnerable}, f"{tested} redirect tests; {len(vulnerable)} open redirect(s)"


ERROR_SIGNATURES = [
    ("sql_error", "high", r"You have an error in your SQL syntax|PG::SyntaxError|syntax error at or near|ORA-0\d{4}|Unclosed quotation mark after the character string|SQLite3::SQLException|SQLSTATE\[\d+\]", "SQL error message triggered by a quote character (possible SQL injection)"),
    ("werkzeug_debugger", "high", r"Werkzeug Debugger|The debugger caught an exception in your WSGI application", "Werkzeug interactive debugger exposed"),
    ("django_debug", "medium", r"You're seeing this error because you have <code>DEBUG = True</code>", "Django DEBUG mode enabled in production"),
    ("laravel_debug", "medium", r"Illuminate\\|Whoops! There was an error|ignition-", "Laravel debug error page exposed"),
    ("aspnet_yellow", "medium", r"Server Error in '/' Application|<b> Stack Trace: </b>", "ASP.NET detailed error page exposed"),
    ("python_trace", "medium", r"Traceback \(most recent call last\)", "Python stack trace disclosed"),
    ("java_trace", "medium", r"at (?:java|javax|org\.springframework|org\.apache)\.[\w.$]+\([\w]+\.java:\d+\)", "Java stack trace disclosed"),
    ("php_error", "low", r"<b>(?:Fatal error|Warning|Parse error)</b>:.+? in <b>/", "PHP error with server file path disclosed"),
]


def check_error_disclosure(ctx: Context, opts: dict) -> Tuple[dict, str]:
    path = urllib.parse.urlsplit(ctx.home().final_url).path or "/"
    token = secrets.token_hex(4)
    probes = [
        f"{path}?id=1%27%22",
        f"{path}?q=%27%22%3E%3Crx{token}%3E",
        f"/rx-{token}.php",
        f"/rx-{token}.aspx",
        f"/rx-{token}",
    ]
    hits = []
    seen = set()
    for p in probes:
        r = _get(ctx, p, max_body=200 * 1024)
        text = r.text
        for key, severity, pattern, title in ERROR_SIGNATURES:
            if key in seen:
                continue
            m = re.search(pattern, text)
            if m:
                # an error string that is also on the normal homepage is not caused by the probe
                if re.search(pattern, ctx.home().text):
                    continue
                seen.add(key)
                start = max(0, m.start() - 60)
                hits.append({"type": key, "severity": severity, "title": title, "probe": p, "status": r.status,
                             "proof": re.sub(r"\s+", " ", text[start:m.end() + 80])[:240]})
    return {"probes": probes, "disclosures": hits}, f"{len(hits)} error disclosure(s)"


def check_http_methods(ctx: Context, opts: dict) -> Tuple[dict, str]:
    url = ctx.home().final_url
    try:
        opt = ctx.http.request(url, "OPTIONS", max_body=4096)
        allow = opt.header("allow") or opt.header("access-control-allow-methods")
    except ScopeError:
        allow = None
    token = secrets.token_hex(8)
    trace_enabled = False
    try:
        tr = ctx.http.request(url, "TRACE", headers={"X-ReconX-Trace": token}, max_body=16384)
        trace_enabled = tr.status == 200 and token in tr.text
    except ScopeError:
        pass
    advertised = [m.strip().upper() for m in (allow or "").split(",") if m.strip()]
    data = {"allow_header": allow, "advertised": advertised, "trace_echo": trace_enabled,
            "note": "PUT/DELETE are reported only as advertised; they are never exercised."}
    return data, f"Allow: {allow or 'not disclosed'}; TRACE echo: {trace_enabled}"


def dns_query(ctx: Context, name: str, rtype: str) -> Tuple[List[str], Optional[str]]:
    dig, nslookup = ctx.tools.get("dig"), ctx.tools.get("nslookup")
    if dig:
        code, out, err, e = run_tool([dig, "+short", "+time=3", "+tries=1", rtype, name], timeout=8)
        if e:
            return [], e
        records = []
        for line in out.splitlines():
            line = line.strip()
            if not line or line.startswith(";"):
                continue
            if rtype == "TXT":
                parts = re.findall(r'"((?:[^"\\]|\\.)*)"', line)
                records.append("".join(parts) if parts else line)
            else:
                records.append(line.rstrip("."))
        return records, None
    if nslookup:
        code, out, err, e = run_tool([nslookup, f"-type={rtype}", name], timeout=8)
        if e:
            return [], e
        if rtype == "TXT":
            return re.findall(r'"([^"]*)"', out), None
        if rtype == "MX":
            return [m.rstrip(".") for m in re.findall(r"mail exchanger = (?:\d+ )?(\S+)", out)], None
        if rtype == "CNAME":
            return [m.rstrip(".") for m in re.findall(r"canonical name = (\S+)", out)], None
        return [], None
    return [], "no DNS tool (dig/nslookup) available"


def _dmarc_policy(records: List[str]) -> Optional[Dict[str, str]]:
    for r in records:
        if r.lower().startswith("v=dmarc1"):
            tags = dict((k.strip().lower(), v.strip()) for k, _, v in (t.partition("=") for t in r.split(";")) if k.strip())
            return tags
    return None


def check_email_security(ctx: Context, opts: dict) -> Tuple[dict, str]:
    host = ctx.canonical_host
    org = org_domain(host)
    mx, err = dns_query(ctx, host, "MX")
    if err:
        raise RuntimeError(err)
    txt, _ = dns_query(ctx, host, "TXT")
    spf = [t for t in txt if t.lower().startswith("v=spf1")]
    host_dmarc = _dmarc_policy(dns_query(ctx, f"_dmarc.{host}", "TXT")[0])
    org_dmarc = None if host == org else _dmarc_policy(dns_query(ctx, f"_dmarc.{org}", "TXT")[0])
    effective = None
    if host_dmarc:
        effective = {"policy": host_dmarc.get("p", "none"), "record_at": f"_dmarc.{host}"}
    elif org_dmarc:
        effective = {"policy": org_dmarc.get("sp") or org_dmarc.get("p", "none"), "record_at": f"_dmarc.{org}"}
    sends_mail = bool(mx) or host == org
    spf_all = None
    if spf:
        m = re.search(r"([+~?-])?all\b", spf[0])
        spf_all = (m.group(1) or "+") + "all" if m else None
    data = {
        "host": host, "organizational_domain": org, "mx": mx, "mail_domain": sends_mail,
        "spf": spf[0] if spf else None, "spf_all": spf_all,
        "dmarc": effective,
    }
    return data, f"MX: {len(mx)}; SPF: {'present' if spf else 'absent'}; DMARC: {effective['policy'] if effective else 'absent'}"


TAKEOVER_FINGERPRINTS = [
    ("GitHub Pages", ("github.io",), "There isn't a GitHub Pages site here."),
    ("Heroku", ("herokuapp.com", "herokudns.com"), "No such app"),
    ("Amazon S3", ("s3.amazonaws.com", "s3-website"), "NoSuchBucket"),
    ("Azure", ("azurewebsites.net", "cloudapp.net", "trafficmanager.net", "blob.core.windows.net"), "404 Web Site not found"),
    ("Shopify", ("myshopify.com",), "Sorry, this shop is currently unavailable."),
    ("Fastly", ("fastly.net",), "Fastly error: unknown domain"),
    ("Pantheon", ("pantheonsite.io",), "The gods are wise"),
    ("Tumblr", ("domains.tumblr.com",), "Whatever you were looking for doesn't currently exist at this address"),
    ("Surge.sh", ("surge.sh",), "project not found"),
    ("Bitbucket", ("bitbucket.io",), "Repository not found"),
]


def check_subdomain_takeover(ctx: Context, opts: dict) -> Tuple[dict, str]:
    cnames, err = dns_query(ctx, ctx.canonical_host, "CNAME")
    if err:
        raise RuntimeError(err)
    body = ctx.home().text
    candidates = []
    for service, suffixes, signature in TAKEOVER_FINGERPRINTS:
        for c in cnames:
            if any(c.lower().endswith(s) or s in c.lower() for s in suffixes):
                candidates.append({"service": service, "cname": c, "unclaimed_signature": signature in body})
    vulnerable = [c for c in candidates if c["unclaimed_signature"]]
    return {"cnames": cnames, "candidates": candidates, "vulnerable": vulnerable}, \
        f"CNAMEs: {', '.join(cnames) or 'none'}; takeover-prone: {len(vulnerable)}"


def check_service_scan(ctx: Context, opts: dict) -> Tuple[dict, str]:
    if ctx.cdn:
        return {"skipped": True, "skip_reason": f"Target is served through {ctx.cdn}; a port scan would probe shared provider infrastructure, not the target."}, "skipped (CDN)"
    nmap = ctx.tools.get("nmap")
    if not nmap:
        return {"skipped": True, "skip_reason": "nmap is not installed"}, "skipped (nmap missing)"
    timeout = min(float(opts.get("timeout", 90)), max(10.0, ctx.remaining() - 20))
    args = [nmap, "-Pn", "-sV", "--version-intensity", "5", "-T4", "--max-retries", "1",
            "--host-timeout", f"{int(timeout)}s", "--top-ports", str(opts.get("top_ports", 100)), "-oX", "-", ctx.resolved_ip]
    code, out, err, e = run_tool(args, timeout=timeout + 15)
    ports, comps = fp.parse_nmap_xml(out)
    ctx.components = fp.dedupe(ctx.components + comps)
    data = {"command": " ".join(args[1:]), "open_ports": ports, "components": comps, "error": e or (err.strip()[:200] if code not in (0, None) else None)}
    return data, f"{len(ports)} open port(s): {', '.join(str(p['port']) + '/' + str(p['service']) for p in ports) or 'none'}"


def check_websocket_origin(ctx: Context, opts: dict) -> Tuple[dict, str]:
    accepted = []
    for path in ("/ws", "/websocket", "/socket.io/?EIO=4&transport=websocket", "/cable"):
        r = _get(ctx, path, max_body=0, headers={
            "Upgrade": "websocket", "Connection": "Upgrade", "Sec-WebSocket-Version": "13",
            "Sec-WebSocket-Key": "dGhlIHNhbXBsZSBub25jZQ==", "Origin": PROBE_ORIGIN})
        if r.status == 101:
            accepted.append({"path": path, "origin_sent": PROBE_ORIGIN})
    return {"cross_origin_upgrades": accepted}, f"{len(accepted)} endpoint(s) accept cross-origin WebSocket handshakes"


def check_cache_poisoning(ctx: Context, opts: dict) -> Tuple[dict, str]:
    base = ctx.home().final_url
    buster = secrets.token_hex(6)
    sep = "&" if "?" in base else "?"
    url = f"{base}{sep}rxcb={buster}"  # unique cache key: never poisons a real user's cache entry
    r1 = _get(ctx, url, headers={"X-Forwarded-Host": CACHE_PROBE_HOST})
    reflected = CACHE_PROBE_HOST in r1.text or CACHE_PROBE_HOST in (r1.header("location") or "")
    cached = False
    if reflected:
        r2 = _get(ctx, url)
        cached = CACHE_PROBE_HOST in r2.text or CACHE_PROBE_HOST in (r2.header("location") or "")
    data = {"probe_url": url, "header": "X-Forwarded-Host", "reflected": reflected, "served_from_cache_to_clean_request": cached,
            "cache_headers": {k: v for k, v in r1.header_map().items() if k in ("cache-control", "age", "x-cache", "cf-cache-status", "x-vercel-cache")}}
    return data, f"X-Forwarded-Host reflected: {reflected}; poisoned cache confirmed: {cached}"


def check_subresource_integrity(ctx: Context, opts: dict) -> Tuple[dict, str]:
    home = ctx.home()
    html = home.text
    missing, total = [], 0
    for tag in re.findall(r"<script[^>]+src=[\"'][^\"']+[\"'][^>]*>", html, re.I):
        src = re.search(r"src=[\"']([^\"']+)", tag, re.I).group(1)
        full = urllib.parse.urljoin(home.final_url, src)
        host = (urllib.parse.urlsplit(full).hostname or "").lower()
        if host and org_domain(host) != org_domain(ctx.canonical_host):
            total += 1
            if "integrity=" not in tag.lower():
                missing.append(full[:200])
    return {"third_party_scripts": total, "missing_integrity": missing}, f"{len(missing)}/{total} third-party script(s) without SRI"


def check_security_policy(ctx: Context, opts: dict) -> Tuple[dict, str]:
    sec = _get(ctx, "/.well-known/security.txt", max_body=16384)
    has_sec = sec.status == 200 and "contact:" in sec.text.lower() and not ctx.is_not_found(sec)
    robots = _get(ctx, "/robots.txt", max_body=65536)
    disallow = []
    if robots.status == 200 and "user-agent" in robots.text.lower():
        disallow = [l.split(":", 1)[1].strip() for l in robots.text.splitlines() if l.lower().startswith("disallow:") and l.split(":", 1)[1].strip()]
    return {"security_txt": has_sec, "robots_disallow": disallow[:30]}, f"security.txt: {has_sec}; robots disallow entries: {len(disallow)}"


def check_whois(ctx: Context, opts: dict) -> Tuple[dict, str]:
    whois = ctx.tools.get("whois")
    if not whois:
        return {"skipped": True, "skip_reason": "whois is not installed"}, "skipped (whois missing)"
    domain = org_domain(ctx.canonical_host)
    code, out, err, e = run_tool([whois, domain], timeout=15)
    data = {"domain": domain, "registrar": None, "expiry": None, "dnssec": None}
    for line in out.splitlines():
        l = line.lower().strip()
        if l.startswith("registrar:") and not data["registrar"]:
            data["registrar"] = line.split(":", 1)[1].strip()
        elif ("registry expiry date:" in l or "expiration date:" in l) and not data["expiry"]:
            data["expiry"] = line.split(":", 1)[1].strip()
        elif l.startswith("dnssec:"):
            data["dnssec"] = line.split(":", 1)[1].strip().lower()
    return data, f"Registrar: {data['registrar'] or 'unknown'}; DNSSEC: {data['dnssec'] or 'unknown'}"
