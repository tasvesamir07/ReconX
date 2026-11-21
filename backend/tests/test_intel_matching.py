"""Vulnerability-database matching against real NVD / OSV records (offline fixtures)."""
import json
import os

import httpx
import pytest

from app.intel import catalog, versioning
from app.intel.cache import MemoryCacheStore
from app.intel.cvss import base_score, describe_exploitability, severity_from_score
from app.intel.exploit import EpssClient, KevCatalog
from app.intel.nvd import NvdClient, match_entry, match_version, reduce_cve
from app.intel.osv import OsvClient, reduce_osv
from app.intel.service import DetectedComponent, IntelService

FIX = os.path.join(os.path.dirname(__file__), "fixtures")


def _load(name):
    with open(os.path.join(FIX, name), encoding="utf-8") as f:
        return json.load(f)


@pytest.fixture(scope="module")
def apache_cves():
    raw = _load("nvd_apache_http_server.json")
    return [r for r in (reduce_cve(v["cve"], "apache", "http_server") for v in raw["vulnerabilities"]) if r]


# ── versioning ──

@pytest.mark.parametrize("a,b,expected", [
    ("2.4.49", "2.4.5", 1), ("2.4.5", "2.4.49", -1), ("1.0", "1.0.0", 0), ("1.1.1k", "1.1.1", 1),
    ("1.1.1k", "1.1.1t", -1), ("3.0.0-rc1", "3.0.0", -1), ("3.0.0", "3.0.0-beta2", 1), ("v1.18.0", "1.18.0", 0),
])
def test_compare(a, b, expected):
    assert versioning.compare(a, b) == expected


def test_in_range_bounds():
    assert versioning.in_range("2.4.49", start_including="2.4.0", end_including="2.4.55")
    assert not versioning.in_range("2.4.56", start_including="2.4.0", end_including="2.4.55")
    assert not versioning.in_range("2.4.52", end_excluding="2.4.52")
    assert versioning.in_range("2.4.51", end_excluding="2.4.52")


# ── NVD matching (real records) ──

def ids(results):
    return {r["cve"]["id"] for r in results}


def test_exact_version_match(apache_cves):
    hits, _ = match_version(apache_cves, "2.4.49")
    assert {"CVE-2021-41773", "CVE-2021-42013", "CVE-2023-25690"} <= ids(hits)


def test_fixed_version_not_matched(apache_cves):
    hits, _ = match_version(apache_cves, "2.4.51")
    assert "CVE-2021-41773" not in ids(hits)
    assert "CVE-2021-42013" not in ids(hits)
    assert "CVE-2023-25690" in ids(hits)  # range 2.4.0 - 2.4.55 still applies


def test_patched_release_has_none_of_these(apache_cves):
    hits, _ = match_version(apache_cves, "2.4.62")
    assert ids(hits) == set()


def test_coarse_version_is_never_matched(apache_cves):
    hits, coarse = match_version(apache_cves, "2.4")
    assert hits == [] and coarse >= 1


def test_wildcard_without_range_is_skipped():
    entry = {"criteria": "cpe:2.3:a:apache:http_server:*:*:*:*:*:*:*:*"}
    assert match_entry(entry, "2.4.49") == (False, False)


def test_non_vulnerable_entries_are_dropped():
    cve = {"id": "CVE-X", "configurations": [{"nodes": [{"cpeMatch": [
        {"vulnerable": False, "criteria": "cpe:2.3:a:apache:http_server:2.4.49:*:*:*:*:*:*:*"}]}]}]}
    assert reduce_cve(cve, "apache", "http_server") is None


def test_reduced_record_keeps_scoring(apache_cves):
    rec = next(c for c in apache_cves if c["id"] == "CVE-2021-41773")
    assert rec["cvss_score"] == 9.8 and rec["cvss_vector"].startswith("CVSS:3.1/")
    assert "CWE-22" in rec["cwes"]


# ── CVSS ──

def test_cvss_base_scores():
    assert base_score("CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H") == 9.8
    assert base_score("CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N") == 6.1
    assert base_score("CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:C/C:H/I:L/A:N/E:H") == 6.9  # temporal metric ignored
    assert base_score("CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:N") == 0.0
    assert base_score("not a vector") is None
    assert severity_from_score(9.8) == "critical" and severity_from_score(6.1) == "medium"
    assert "without authentication" in describe_exploitability("CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H")


# ── OSV ──

def test_osv_reduction_scopes_fixed_versions_to_package():
    vulns = [reduce_osv(v, package="jquery", ecosystem="npm") for v in _load("osv_jquery_3.4.1.json")["vulns"]]
    by_cve = {c: v for v in vulns for c in v["cve_ids"]}
    assert {"CVE-2020-11022", "CVE-2020-11023"} <= set(by_cve)
    assert by_cve["CVE-2020-11022"]["fixed_versions"] == ["3.5.0"]
    assert by_cve["CVE-2020-11022"]["severity"] == "medium"


# ── catalog ──

def test_catalog_lookups():
    assert catalog.lookup("Apache") == "apache_httpd"
    assert catalog.lookup("Apache httpd") == "apache_httpd"
    assert catalog.lookup("Microsoft-IIS") == "iis"
    assert catalog.lookup("Vercel") is None  # unknown platforms are never guessed
    assert catalog.lookup_cpe("cpe:/a:igor_sysoev:nginx:1.18.0") == "nginx"
    assert ("f5", "nginx") in catalog.nvd_ids("nginx") and ("nginx", "nginx") in catalog.nvd_ids("nginx")


# ── service, with recorded HTTP responses ──

def _transport():
    nvd = _load("nvd_apache_http_server.json")
    osv = _load("osv_jquery_3.4.1.json")

    def handler(request: httpx.Request):
        url = str(request.url)
        if "services.nvd.nist.gov" in url:
            assert "noRejected" in url and "virtualMatchString=cpe%3A2.3%3Aa%3Aapache%3Ahttp_server" in url
            return httpx.Response(200, json=nvd)
        if "api.osv.dev" in url:
            body = json.loads(request.content)
            return httpx.Response(200, json=osv if body["package"]["name"] == "jquery" and body["version"] == "3.4.1" else {})
        if "cisa.gov" in url:
            return httpx.Response(200, json={"vulnerabilities": [{"cveID": "CVE-2021-41773", "dateAdded": "2021-11-03",
                                                                   "knownRansomwareCampaignUse": "Known"}]})
        if "api.first.org" in url:
            return httpx.Response(200, json={"data": [{"cve": "CVE-2021-41773", "epss": "0.9999", "percentile": "0.9998"}]})
        return httpx.Response(404)
    return httpx.MockTransport(handler)


def test_service_end_to_end_with_recorded_responses():
    cache = MemoryCacheStore()
    t = _transport()
    svc = IntelService(NvdClient(cache=cache, transport=t, sleep=lambda s: None),
                       OsvClient(cache=cache, transport=t), KevCatalog(cache=cache, transport=t),
                       EpssClient(cache=cache, transport=t))
    result = svc.correlate([
        DetectedComponent(name="Apache", version="2.4.49", catalog_key="apache_httpd", evidence="Server: Apache/2.4.49"),
        DetectedComponent(name="jquery", version="3.4.1", ecosystem="npm", package="jquery"),
        DetectedComponent(name="nginx", version=None, catalog_key="nginx"),
    ])
    got = {m.vuln_id for m in result.matches}
    assert {"CVE-2021-41773", "CVE-2021-42013", "GHSA-gxr4-xjj5-5px2"} <= got
    assert any("version not disclosed" in n for n in result.notes)
    ctx = svc.exploitation(["CVE-2021-41773"])
    assert ctx["CVE-2021-41773"]["kev"]["date_added"] == "2021-11-03"
    assert ctx["CVE-2021-41773"]["epss"] == (0.9999, 0.9998)


def test_stale_cache_is_used_when_nvd_is_down():
    cache = MemoryCacheStore()
    cache.put("nvd:cpe:apache:http_server", [{"id": "CVE-OLD", "matches": [
        {"criteria": "cpe:2.3:a:apache:http_server:2.4.49:*:*:*:*:*:*:*"}]}])
    # make the entry stale
    payload, _ = cache._data["nvd:cpe:apache:http_server"]
    from datetime import timedelta
    from app.models.base import utc_now
    cache._data["nvd:cpe:apache:http_server"] = (payload, utc_now() - timedelta(days=3))
    down = httpx.MockTransport(lambda r: httpx.Response(503))
    client = NvdClient(cache=cache, transport=down, sleep=lambda s: None)
    data, meta = client.product_cves("apache", "http_server")
    assert meta["stale"] is True and data[0]["id"] == "CVE-OLD"
