"""
NVD CVE API 2.0 client and CPE version matcher.

Strategy: fetch every CVE whose applicability lists the product
(virtualMatchString=cpe:2.3:a:<vendor>:<product>), keep only the CPE match
entries for that product, and evaluate version rules locally. This is exact
and reproducible, and one cached download serves every version of a product.

Precision rules (a CVE is reported only when the database is unambiguous):
- exact-version entries must equal the detected version
- range entries are evaluated only when the detected version is at least as
  specific as the range bounds ("2.4" is never matched against "< 2.4.50")
- entries that say "all versions" with no range are skipped
"""
import logging
import threading
import time
from typing import Any, Callable, Dict, List, Optional, Tuple
from urllib.parse import urlencode

import httpx

from app.intel import versioning
from app.intel.cvss import best_nvd_metric

logger = logging.getLogger("reconx.intel.nvd")

NVD_URL = "https://services.nvd.nist.gov/rest/json/cves/2.0"
RANGE_KEYS = ("versionStartIncluding", "versionStartExcluding", "versionEndIncluding", "versionEndExcluding")
USER_AGENT = "ReconX-VulnIntel/1.0"


class IntelUnavailable(Exception):
    """Raised when a database cannot be reached and no cached copy exists."""


def reduce_cve(cve: Dict[str, Any], vendor: str, product: str) -> Optional[Dict[str, Any]]:
    """Keeps only what matching and reporting need, and only this product's CPE entries."""
    matches: List[Dict[str, Any]] = []
    for cfg in cve.get("configurations", []) or []:
        nodes = cfg.get("nodes", []) or []
        is_and = (cfg.get("operator") or "").upper() == "AND" and len(nodes) > 1
        platform: List[str] = []
        if is_and:
            for node in nodes:
                for m in node.get("cpeMatch", []) or []:
                    parts = (m.get("criteria") or "").split(":")
                    if len(parts) > 4 and not (parts[3] == vendor and parts[4] == product):
                        platform.append(m["criteria"])
        for node in nodes:
            if node.get("negate"):
                continue
            for m in node.get("cpeMatch", []) or []:
                parts = (m.get("criteria") or "").split(":")
                if len(parts) < 7 or parts[3] != vendor or parts[4] != product:
                    continue
                if not m.get("vulnerable"):
                    continue
                entry = {"criteria": m["criteria"]}
                for k in RANGE_KEYS:
                    if m.get(k):
                        entry[k] = m[k]
                if is_and and platform:
                    entry["platform"] = platform[:3]
                matches.append(entry)
    if not matches:
        return None

    description = next(
        (d.get("value", "") for d in cve.get("descriptions", []) or [] if d.get("lang") == "en"),
        "",
    )
    score, vector, cvss_version = best_nvd_metric(cve.get("metrics", {}) or {})
    cwes = sorted({
        d.get("value", "")
        for w in cve.get("weaknesses", []) or []
        for d in w.get("description", []) or []
        if (d.get("value") or "").startswith("CWE-")
    })
    references = []
    for r in cve.get("references", []) or []:
        url = r.get("url")
        if url and url not in references:
            references.append(url)
    return {
        "id": cve.get("id"),
        "published": cve.get("published"),
        "description": description[:1500],
        "cvss_score": score,
        "cvss_vector": vector,
        "cvss_version": cvss_version,
        "cwes": cwes,
        "references": references[:8],
        "matches": matches,
    }


def match_entry(entry: Dict[str, Any], version: str) -> Tuple[bool, bool]:
    """Evaluates one CPE match entry. Returns (matched, too_coarse)."""
    parts = entry["criteria"].split(":")
    cpe_version = parts[5]
    cpe_update = parts[6] if len(parts) > 6 else "*"
    bounds = {k: entry.get(k) for k in RANGE_KEYS if entry.get(k)}

    if cpe_version not in ("*", "-"):
        target = cpe_version if cpe_update in ("*", "-") else f"{cpe_version}{cpe_update}"
        if versioning.specificity(version) < versioning.specificity(target):
            return False, True
        return versioning.compare(version, target) == 0, False

    if cpe_version == "-" or not bounds:
        return False, False  # not applicable / "all versions" without a range: skipped by design

    if any(versioning.specificity(version) < versioning.specificity(b) for b in bounds.values()):
        return False, True
    return versioning.in_range(
        version,
        start_including=bounds.get("versionStartIncluding"),
        start_excluding=bounds.get("versionStartExcluding"),
        end_including=bounds.get("versionEndIncluding"),
        end_excluding=bounds.get("versionEndExcluding"),
    ), False


def match_version(reduced_cves: List[Dict[str, Any]], version: str) -> Tuple[List[Dict[str, Any]], int]:
    """Returns (matching CVEs with the entry that matched, count of too-coarse comparisons)."""
    results: List[Dict[str, Any]] = []
    coarse = 0
    if not versioning.is_comparable(version):
        return results, 0
    for cve in reduced_cves:
        hit = None
        cve_coarse = False
        for entry in cve.get("matches", []):
            matched, too_coarse = match_entry(entry, version)
            if matched:
                hit = entry
                break
            cve_coarse = cve_coarse or too_coarse
        if hit:
            results.append({"cve": cve, "entry": hit})
        elif cve_coarse:
            coarse += 1
    return results, coarse


def fixed_version_hint(entry: Dict[str, Any]) -> Optional[str]:
    """Upgrade target derived from the matched range, if NVD states one."""
    if entry.get("versionEndExcluding"):
        return entry["versionEndExcluding"]
    return None


class NvdClient:
    _lock = threading.Lock()
    _last_request = 0.0

    def __init__(
        self,
        api_key: str = "",
        cache=None,
        ttl_hours: float = 24,
        timeout: float = 30,
        sleep: Callable[[float], None] = time.sleep,
        transport: Optional[httpx.BaseTransport] = None,
    ):
        self.api_key = api_key or ""
        self.cache = cache
        self.ttl_hours = ttl_hours
        self.timeout = timeout
        self._sleep = sleep
        self._transport = transport
        # Public limits: 5 requests / 30s without a key, 50 / 30s with one.
        self.min_interval = 0.8 if self.api_key else 6.5

    def product_cves(self, vendor: str, product: str) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        key = f"nvd:cpe:{vendor}:{product}"
        cached, fresh = (None, False)
        if self.cache:
            cached, fresh = self.cache.get(key, self.ttl_hours)
        if cached is not None and fresh:
            return cached, {"source": "cache", "stale": False}
        try:
            data = self._fetch_all(vendor, product)
        except Exception as exc:
            if cached is not None:
                logger.warning("NVD fetch failed for %s:%s, using stale cache: %s", vendor, product, exc)
                return cached, {"source": "cache", "stale": True, "error": str(exc)}
            raise IntelUnavailable(f"NVD unreachable for {vendor}:{product}: {exc}") from exc
        if self.cache:
            self.cache.put(key, data)
        return data, {"source": "live", "stale": False}

    def _throttle(self) -> None:
        with NvdClient._lock:
            wait = NvdClient._last_request + self.min_interval - time.monotonic()
            if wait > 0:
                self._sleep(wait)
            NvdClient._last_request = time.monotonic()

    def _get(self, client: httpx.Client, params: Dict[str, Any]) -> Dict[str, Any]:
        headers = {"User-Agent": USER_AGENT}
        if self.api_key:
            headers["apiKey"] = self.api_key
        # noRejected is a bare flag in the NVD API (no "=value").
        url = f"{NVD_URL}?{urlencode(params)}&noRejected"
        last_error: Optional[str] = None
        for attempt in range(4):
            self._throttle()
            resp = client.get(url, headers=headers)
            if resp.status_code == 200:
                return resp.json()
            last_error = f"HTTP {resp.status_code}"
            if resp.status_code in (403, 429, 500, 502, 503, 504):
                self._sleep(6.0 * (attempt + 1))
                continue
            break
        raise RuntimeError(last_error or "NVD request failed")

    def _fetch_all(self, vendor: str, product: str) -> List[Dict[str, Any]]:
        reduced: List[Dict[str, Any]] = []
        start = 0
        with httpx.Client(timeout=self.timeout, transport=self._transport) as client:
            while True:
                params = {
                    "virtualMatchString": f"cpe:2.3:a:{vendor}:{product}",
                    "resultsPerPage": 2000,
                    "startIndex": start,
                }
                page = self._get(client, params)
                items = page.get("vulnerabilities", []) or []
                for item in items:
                    r = reduce_cve(item.get("cve", {}), vendor, product)
                    if r:
                        reduced.append(r)
                total = int(page.get("totalResults", 0) or 0)
                start += len(items)
                if not items or start >= total:
                    break
        return reduced
