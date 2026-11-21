"""
OSV.dev client for package ecosystems (npm JavaScript libraries detected in
pages). OSV performs exact version matching server-side.
"""
import logging
from typing import Any, Dict, List, Optional, Tuple

import httpx

from app.intel.cvss import base_score, severity_from_score
from app.intel.nvd import IntelUnavailable, USER_AGENT

logger = logging.getLogger("reconx.intel.osv")

OSV_URL = "https://api.osv.dev/v1/query"

_LABEL_TO_SEVERITY = {"CRITICAL": "critical", "HIGH": "high", "MODERATE": "medium", "MEDIUM": "medium", "LOW": "low"}


def reduce_osv(vuln: Dict[str, Any], package: Optional[str] = None, ecosystem: Optional[str] = None) -> Dict[str, Any]:
    vector = None
    for s in vuln.get("severity", []) or []:
        if (s.get("type") or "").upper() in ("CVSS_V3", "CVSS_V31") and s.get("score"):
            vector = s["score"]
            break
    score = base_score(vector) if vector else None
    label = ((vuln.get("database_specific") or {}).get("severity") or "").upper()
    severity = severity_from_score(score) if score is not None else _LABEL_TO_SEVERITY.get(label, "medium")
    aliases = vuln.get("aliases", []) or []
    cve_ids = sorted({a for a in aliases + [vuln.get("id", "")] if a.startswith("CVE-")})
    fixed: List[str] = []
    for aff in vuln.get("affected", []) or []:
        pkg = aff.get("package") or {}
        # An advisory can cover several packages (jquery, jquery-rails, ...): only use our package's ranges.
        if package and (pkg.get("name", "").lower() != package.lower()
                        or (ecosystem and pkg.get("ecosystem", "").lower() != ecosystem.lower())):
            continue
        for rng in aff.get("ranges", []) or []:
            for ev in rng.get("events", []) or []:
                if ev.get("fixed") and ev["fixed"] not in fixed:
                    fixed.append(ev["fixed"])
    cwes = list((vuln.get("database_specific") or {}).get("cwe_ids", []) or [])
    refs = []
    for r in vuln.get("references", []) or []:
        if r.get("url") and r["url"] not in refs:
            refs.append(r["url"])
    return {
        "id": vuln.get("id"),
        "cve_ids": cve_ids,
        "summary": (vuln.get("summary") or "")[:250],
        "details": (vuln.get("details") or "")[:1500],
        "cvss_score": score,
        "cvss_vector": vector,
        "severity": severity,
        "cwes": cwes,
        "references": refs[:8],
        "fixed_versions": fixed[:5],
    }


class OsvClient:
    def __init__(self, cache=None, ttl_hours: float = 24, timeout: float = 20,
                 transport: Optional[httpx.BaseTransport] = None):
        self.cache = cache
        self.ttl_hours = ttl_hours
        self.timeout = timeout
        self._transport = transport

    def query(self, ecosystem: str, name: str, version: str) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        key = f"osv:{ecosystem}:{name}:{version}"
        cached, fresh = (None, False)
        if self.cache:
            cached, fresh = self.cache.get(key, self.ttl_hours)
        if cached is not None and fresh:
            return cached, {"source": "cache", "stale": False}
        try:
            data = self._fetch(ecosystem, name, version)
        except Exception as exc:
            if cached is not None:
                return cached, {"source": "cache", "stale": True, "error": str(exc)}
            raise IntelUnavailable(f"OSV unreachable for {ecosystem}/{name}@{version}: {exc}") from exc
        if self.cache:
            self.cache.put(key, data)
        return data, {"source": "live", "stale": False}

    def _fetch(self, ecosystem: str, name: str, version: str) -> List[Dict[str, Any]]:
        results: List[Dict[str, Any]] = []
        body: Dict[str, Any] = {"version": version, "package": {"name": name, "ecosystem": ecosystem}}
        with httpx.Client(timeout=self.timeout, transport=self._transport, headers={"User-Agent": USER_AGENT}) as client:
            for _ in range(10):  # follow pagination, bounded
                resp = client.post(OSV_URL, json=body)
                if resp.status_code != 200:
                    raise RuntimeError(f"HTTP {resp.status_code}")
                data = resp.json()
                results.extend(reduce_osv(v, package=name, ecosystem=ecosystem) for v in data.get("vulns", []) or [])
                token = data.get("next_page_token")
                if not token:
                    break
                body["page_token"] = token
        return results
