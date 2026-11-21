"""
Correlates software components detected during a scan with vulnerability
databases and returns database-backed matches.
"""
import logging
from dataclasses import dataclass, field
from typing import Dict, Iterable, List, Optional, Tuple

from app.intel import catalog, versioning
from app.intel.cvss import severity_from_score
from app.intel.exploit import EpssClient, KevCatalog
from app.intel.nvd import IntelUnavailable, NvdClient, fixed_version_hint, match_version
from app.intel.osv import OsvClient

logger = logging.getLogger("reconx.intel.service")


@dataclass
class DetectedComponent:
    name: str
    version: Optional[str] = None
    catalog_key: Optional[str] = None
    ecosystem: Optional[str] = None  # "npm" for JavaScript libraries
    package: Optional[str] = None
    source: str = ""
    evidence: str = ""
    location: str = ""
    backport_risk: bool = False
    evidence_id: Optional[str] = None

    @property
    def display(self) -> str:
        base = catalog.display_name(self.catalog_key) if self.catalog_key else (self.package or self.name)
        return f"{base} {self.version}".strip() if self.version else base

    @property
    def identity(self) -> Tuple[str, str]:
        return (self.catalog_key or self.package or self.name.lower(), (self.version or "").lower())


@dataclass
class VulnMatch:
    source: str  # nvd | osv
    vuln_id: str
    cve_ids: List[str]
    component: DetectedComponent
    title: str
    description: str
    cvss_score: Optional[float]
    cvss_vector: Optional[str]
    severity: str
    cwes: List[str] = field(default_factory=list)
    references: List[str] = field(default_factory=list)
    fixed_versions: List[str] = field(default_factory=list)
    platform: List[str] = field(default_factory=list)


@dataclass
class CorrelationResult:
    matches: List[VulnMatch] = field(default_factory=list)
    notes: List[str] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)
    checked: List[str] = field(default_factory=list)


def _first_sentence(text: str, limit: int = 110) -> str:
    s = (text or "").strip().split(". ")[0].strip().rstrip(".")
    return s if len(s) <= limit else s[: limit - 1].rstrip() + "…"


class IntelService:
    def __init__(self, nvd: NvdClient, osv: OsvClient, kev: KevCatalog, epss: EpssClient):
        self.nvd = nvd
        self.osv = osv
        self.kev = kev
        self.epss = epss

    @classmethod
    def default(cls) -> "IntelService":
        from app.config import settings
        from app.intel.cache import DatabaseCacheStore
        cache = DatabaseCacheStore()
        ttl = settings.INTEL_CACHE_TTL_HOURS
        timeout = settings.INTEL_HTTP_TIMEOUT_SECONDS
        return cls(
            nvd=NvdClient(api_key=settings.NVD_API_KEY, cache=cache, ttl_hours=ttl, timeout=timeout),
            osv=OsvClient(cache=cache, ttl_hours=ttl, timeout=timeout),
            kev=KevCatalog(cache=cache, timeout=timeout),
            epss=EpssClient(cache=cache, ttl_hours=ttl, timeout=timeout),
        )

    def correlate(self, components: Iterable[DetectedComponent]) -> CorrelationResult:
        result = CorrelationResult()
        seen = set()
        for comp in components:
            if comp.identity in seen:
                continue
            seen.add(comp.identity)

            if comp.ecosystem and comp.package:
                if not versioning.is_comparable(comp.version):
                    result.notes.append(f"{comp.package}: version not disclosed, library not matched against OSV.")
                    continue
                self._correlate_osv(comp, result)
            elif comp.catalog_key:
                if not versioning.is_comparable(comp.version):
                    result.notes.append(f"{catalog.display_name(comp.catalog_key)}: version not disclosed, CVE matching not possible.")
                    continue
                self._correlate_nvd(comp, result)
        return result

    def _correlate_nvd(self, comp: DetectedComponent, result: CorrelationResult) -> None:
        result.checked.append(f"NVD: {comp.display}")
        found: Dict[str, VulnMatch] = {}
        coarse_total = 0
        for vendor, product in catalog.nvd_ids(comp.catalog_key):
            try:
                cves, meta = self.nvd.product_cves(vendor, product)
            except IntelUnavailable as exc:
                result.errors.append(str(exc))
                continue
            if meta.get("stale"):
                result.notes.append(f"NVD unreachable; used cached data for {vendor}:{product}.")
            hits, coarse = match_version(cves, comp.version)
            coarse_total += coarse
            for hit in hits:
                cve = hit["cve"]
                if cve["id"] in found:
                    continue
                entry = hit["entry"]
                fixed = fixed_version_hint(entry)
                found[cve["id"]] = VulnMatch(
                    source="nvd",
                    vuln_id=cve["id"],
                    cve_ids=[cve["id"]],
                    component=comp,
                    title=f"{cve['id']}: {_first_sentence(cve.get('description', ''))}",
                    description=cve.get("description", ""),
                    cvss_score=cve.get("cvss_score"),
                    cvss_vector=cve.get("cvss_vector"),
                    severity=severity_from_score(cve.get("cvss_score")),
                    cwes=cve.get("cwes", []),
                    references=[f"https://nvd.nist.gov/vuln/detail/{cve['id']}"] + [r for r in cve.get("references", []) if "nvd.nist.gov" not in r][:5],
                    fixed_versions=[fixed] if fixed else [],
                    platform=entry.get("platform", []),
                )
        if coarse_total:
            result.notes.append(
                f"{comp.display}: banner version is not precise enough to evaluate {coarse_total} NVD range rule(s); those were not reported."
            )
        result.matches.extend(found.values())

    def _correlate_osv(self, comp: DetectedComponent, result: CorrelationResult) -> None:
        result.checked.append(f"OSV: {comp.package}@{comp.version}")
        try:
            vulns, meta = self.osv.query(comp.ecosystem, comp.package, comp.version)
        except IntelUnavailable as exc:
            result.errors.append(str(exc))
            return
        if meta.get("stale"):
            result.notes.append(f"OSV unreachable; used cached data for {comp.package}.")
        for v in vulns:
            primary = v["cve_ids"][0] if v["cve_ids"] else v["id"]
            summary = v.get("summary") or _first_sentence(v.get("details", ""))
            result.matches.append(VulnMatch(
                source="osv",
                vuln_id=v["id"],
                cve_ids=v["cve_ids"],
                component=comp,
                title=f"{primary}: {summary}"[:240],
                description=v.get("details") or summary,
                cvss_score=v.get("cvss_score"),
                cvss_vector=v.get("cvss_vector"),
                severity=v.get("severity", "medium"),
                cwes=v.get("cwes", []),
                references=[f"https://osv.dev/vulnerability/{v['id']}"] + v.get("references", [])[:5],
                fixed_versions=v.get("fixed_versions", []),
            ))

    def exploitation(self, cve_ids: Iterable[str]) -> Dict[str, Dict]:
        """KEV and EPSS context for each CVE id."""
        ids = sorted(set(c for c in cve_ids if c and c.startswith("CVE-")))
        if not ids:
            return {}
        epss = self.epss.scores(ids)
        out: Dict[str, Dict] = {}
        for cve in ids:
            out[cve] = {"kev": self.kev.lookup(cve), "epss": epss.get(cve)}
        return out
