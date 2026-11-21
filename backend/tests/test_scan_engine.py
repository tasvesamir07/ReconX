"""Scan engine: fingerprinting, preset plans, false-positive suppression, scope pinning."""
import pytest

from app.workers.engine import fingerprint as fp
from app.workers.engine import plan as engine_plan
from app.workers.engine.checks import Context, check_sensitive_files, similarity, redact, org_domain
from app.workers.engine.http import HttpClient, Response, ScopeError


# ── presets ──

def test_presets_are_strict_supersets():
    normal = {s["check_id"] for s in engine_plan.build_plan("normal")}
    moderate = {s["check_id"] for s in engine_plan.build_plan("moderate")}
    ultimate = {s["check_id"] for s in engine_plan.build_plan("ultimate")}
    assert normal < moderate < ultimate


def test_plan_is_deterministic_and_nuclei_last():
    a = engine_plan.build_plan("ultimate")
    b = engine_plan.build_plan("ultimate")
    assert a == b
    assert a[-1]["check_id"] == "vuln.nuclei"


def test_deeper_presets_never_reduce_depth():
    def opts(p, cid):
        return next(s["options"] for s in engine_plan.build_plan(p) if s["check_id"] == cid)
    assert opts("normal", "fingerprint.technology")["scripts"] <= opts("moderate", "fingerprint.technology")["scripts"] \
        <= opts("ultimate", "fingerprint.technology")["scripts"]
    assert opts("moderate", "network.service_scan")["top_ports"] < opts("ultimate", "network.service_scan")["top_ports"]


# ── fingerprinting ──

def test_server_header_versions():
    comps = fp.parse_product_header("Apache/2.4.49 (Unix) OpenSSL/1.1.1k", "server")
    assert [(c["name"], c["version"]) for c in comps] == [("Apache", "2.4.49"), ("OpenSSL", "1.1.1k")]


def test_distro_packaging_flags_backport_risk():
    comps = fp.parse_product_header("Apache/2.4.41 (Ubuntu)", "server")
    assert comps[0]["version"] == "2.4.41" and comps[0]["backport_risk"] is True
    php = fp.parse_product_header("PHP/7.4.3-4ubuntu2.19", "x-powered-by")
    assert php[0]["version"] == "7.4.3" and php[0]["backport_risk"] is True


def test_versionless_and_platform_headers_have_no_version():
    assert fp.parse_product_header("nginx", "server")[0]["version"] is None
    vercel = fp.parse_product_header("Vercel", "server")[0]
    assert vercel["kind"] == "platform" and vercel["version"] is None


@pytest.mark.parametrize("url,package,version", [
    ("https://code.jquery.com/jquery-3.4.1.min.js", "jquery", "3.4.1"),
    ("https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/4.3.1/js/bootstrap.min.js", "bootstrap", "4.3.1"),
    ("https://cdn.jsdelivr.net/npm/lodash@4.17.15/lodash.min.js", "lodash", "4.17.15"),
    ("https://unpkg.com/@popperjs/core@2.11.8/dist/umd/popper.min.js", "@popperjs/core", "2.11.8"),
    ("/wp-includes/js/jquery/jquery.min.js?ver=3.7.1", "jquery", "3.7.1"),
])
def test_library_urls(url, package, version):
    lib = fp.library_from_url(url)
    assert lib and lib["package"] == package and lib["version"] == version and lib["ecosystem"] == "npm"


def test_script_banner_and_generator():
    libs = fp.libraries_from_script("/*! jQuery v3.4.1 | (c) JS Foundation */", "/js/app.js")
    assert libs[0]["package"] == "jquery" and libs[0]["version"] == "3.4.1"
    gen = fp.parse_generator('<meta name="generator" content="WordPress 6.2.1">')
    assert gen[0]["name"] == "WordPress" and gen[0]["version"] == "6.2.1"


def test_cdn_detection():
    assert fp.detect_cdn({"server": "Vercel"}) == "Vercel"
    assert fp.detect_cdn({"cf-ray": "abc"}) == "Cloudflare"
    assert fp.detect_cdn({"server": "nginx"}) is None


def test_nmap_xml_parsing():
    xml = """<?xml version="1.0"?><nmaprun><host><ports>
      <port protocol="tcp" portid="443"><state state="open"/><service name="http" product="Apache httpd" version="2.4.49"
        extrainfo="(Unix) OpenSSL/1.1.1k"><cpe>cpe:/a:apache:http_server:2.4.49</cpe></service></port>
      <port protocol="tcp" portid="22"><state state="closed"/><service name="ssh"/></port>
    </ports></host></nmaprun>"""
    ports, comps = fp.parse_nmap_xml(xml)
    assert [p["port"] for p in ports] == [443]
    assert comps[0]["cpe"] == "cpe:/a:apache:http_server:2.4.49" and comps[0]["version"] == "2.4.49"


# ── false-positive suppression ──

def _resp(status, body, url="https://t.example/x"):
    r = Response(url, "GET")
    r.status, r.body = status, body
    return r


class FakeHttp:
    """Serves a catch-all single-page app: every path returns the same shell."""
    def __init__(self, routes=None):
        self.routes = routes or {}
        self.request_count = 0
        self.shell = b"<html><head><title>App</title></head><body><div id=root></div><script src=/a.js></script></body></html>"

    def in_scope(self, url):
        return "t.example" in url

    def get(self, url, **kw):
        self.request_count += 1
        path = url.split("t.example", 1)[1] or "/"
        if path in self.routes:
            return _resp(200, self.routes[path], url)
        return _resp(200, self.shell.replace(b"root", f"root-{hash(path) % 999}".encode()), url)

    def request(self, url, method="GET", **kw):
        return self.get(url, **kw)


def _ctx(http):
    ctx = Context("https://t.example/", "t.example", "203.0.113.10", "ultimate", http, {}, deadline=10**12)
    ctx.homepage = http.get("https://t.example/")
    ctx.not_found = [http.get("https://t.example/rx-nf-1"), http.get("https://t.example/rx-nf-2/")]
    ctx.catch_all = True
    return ctx


def test_catch_all_site_produces_no_exposures():
    """The original false positive: /admin and /server-status returning the SPA shell."""
    data, _ = check_sensitive_files(_ctx(FakeHttp()), {"depth": "full"})
    assert data["exposed"] == []


def test_real_exposures_are_found_on_catch_all_site():
    http = FakeHttp({"/.env": b"APP_KEY=abc\nDB_PASSWORD=hunter2\n",
                     "/server-status": b"<html><h1>Apache Server Status for t.example</h1></html>"})
    data, _ = check_sensitive_files(_ctx(http), {"depth": "core"})
    found = {e["path"]: e for e in data["exposed"]}
    assert set(found) == {"/.env", "/server-status"}
    assert "hunter2" not in found["/.env"]["proof"]  # secrets are never stored


def test_similarity_ignores_volatile_tokens():
    a = b"<html>nonce=8f3a9c1d2e4b5a6f id=1234 <p>Hello world</p></html>"
    b = b"<html>nonce=0a1b2c3d4e5f6a7b id=9876 <p>Hello world</p></html>"
    assert similarity(a, b) > 0.95
    assert similarity(a, b"ref: refs/heads/main") < 0.5


def test_redaction_and_org_domain():
    assert redact("DB_PASSWORD=hunter2\nplain line") == "DB_PASSWORD=<redacted>\nplain line"
    assert org_domain("tasve.hepttech.com") == "hepttech.com"
    assert org_domain("shop.example.co.uk") == "example.co.uk"


# ── scope ──

def test_http_client_refuses_other_hosts():
    client = HttpClient("t.example")
    assert client.in_scope("https://t.example/a") and not client.in_scope("https://evil.example/")
    assert not client.in_scope("ftp://t.example/")
    with pytest.raises(ScopeError):
        client.request("https://evil.example/")
