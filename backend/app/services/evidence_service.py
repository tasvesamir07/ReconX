"""
Findings pipeline: evidence -> deterministic findings -> database correlation
(NVD / OSV) -> active-verification merge (Nuclei) -> exploitation context
(KEV / EPSS) -> stored findings.
"""
import asyncio
import logging
import uuid
from typing import Callable, List, Optional

from sqlalchemy.orm import Session

from app.config import settings
from app.models.evidence import Evidence
from app.models.finding import Finding
from app.services import findings_engine as fe

logger = logging.getLogger("reconx.findings")


class EvidenceAnalysisService:

    @staticmethod
    def collect(db: Session, scan_id: uuid.UUID) -> List[fe.EvidenceView]:
        rows = db.query(Evidence).filter(Evidence.scan_id == scan_id).all()
        return [fe.EvidenceView(id=str(r.id), type=(r.evidence_type or "").strip(), data=r.normalized_data or {}) for r in rows]

    @staticmethod
    def record(db: Session, scan_id: uuid.UUID, asset: str, drafts: List[fe.Draft]) -> List[Finding]:
        existing = {f.finding_key for f in db.query(Finding).filter(Finding.scan_id == scan_id).all()}
        created = []
        for d in sorted(drafts, key=fe.sort_key):
            if d.key in existing:
                continue
            existing.add(d.key)
            finding = Finding(
                scan_id=scan_id, finding_key=d.key, title=d.title[:255], category=d.category, severity=d.severity,
                confidence=d.confidence, affected_asset=asset, description=d.description, impact=d.impact,
                remediation=d.remediation, references=d.references, evidence_ids=d.evidence_ids,
                finding_class=d.finding_class, source=d.source, component=d.component, cve_ids=d.cve_ids or None,
                cwe_ids=d.cwe_ids or None, cvss_score=d.cvss_score, cvss_vector=d.cvss_vector,
                epss_score=d.epss_score, epss_percentile=d.epss_percentile, is_kev=d.is_kev,
            )
            db.add(finding)
            created.append(finding)
        db.commit()
        return created

    @staticmethod
    async def run_pipeline(
        db: Session,
        scan_id: uuid.UUID,
        asset: str,
        log: Callable[[str, str, str], None],
        intel=None,
    ) -> List[Finding]:
        views = EvidenceAnalysisService.collect(db, scan_id)
        drafts = fe.derive_check_findings(views, asset)
        components = fe.components_from_evidence(views)

        if settings.INTEL_ENABLED and components:
            if intel is None:
                from app.intel.service import IntelService
                intel = IntelService.default()
            versioned = [c for c in components if c.version]
            log("lifecycle", "info", f"Matching {len(versioned)} versioned component(s) against NVD and OSV vulnerability databases.")
            try:
                result = await asyncio.to_thread(intel.correlate, components)
                drafts += fe.drafts_from_matches(result.matches, asset)
                for note in result.notes:
                    log("intel", "info", note)
                for err in result.errors:
                    log("intel", "warning", f"Vulnerability database unavailable: {err}")
                log("lifecycle", "info", f"Vulnerability databases: {len(result.matches)} match(es) "
                                         f"across {len(result.checked)} component lookup(s).")
            except Exception as exc:  # intel must never fail the scan
                logger.exception("Intel correlation failed")
                log("intel", "warning", f"Vulnerability database correlation failed: {exc}")

        drafts = fe.merge_verifications(fe.dedupe(drafts))
        cves = {c for d in drafts for c in d.cve_ids}
        if cves and settings.INTEL_ENABLED and intel is not None:
            try:
                context = await asyncio.to_thread(intel.exploitation, cves)
                fe.apply_exploitation(drafts, context)
                kev = sum(1 for d in drafts if d.is_kev)
                if kev:
                    log("intel", "warning", f"{kev} finding(s) are listed in the CISA Known Exploited Vulnerabilities catalog.")
            except Exception as exc:
                log("intel", "warning", f"KEV/EPSS enrichment failed: {exc}")

        # AI-driven findings analysis, severity calibration, and attack chain synthesis
        if drafts:
            try:
                from app.ai.findings_analyzer import AIFindingsAnalyzer
                from app.models.audit import AIProviderEvent
                from app.models.base import utc_now
                log("ai_decision", "info", f"AI Security Analyst reviewing {len(drafts)} candidate finding(s) and target evidence.")
                drafts, telemetry = await asyncio.to_thread(
                    AIFindingsAnalyzer.analyze_and_calibrate, drafts, views, asset, components
                )
                if telemetry.get("provider"):
                    db.add(AIProviderEvent(
                        scan_id=scan_id,
                        provider=telemetry["provider"].split(":")[0],
                        model=telemetry["provider"].split(":", 1)[-1],
                        operation="findings_analysis",
                        status="success" if telemetry["success"] else "failed",
                        latency_ms=telemetry.get("latency_ms") or 0,
                        error_code=(telemetry.get("error") or None) and telemetry["error"][:100],
                        created_at=utc_now(),
                    ))
                    db.commit()
                if telemetry.get("success"):
                    log("ai_decision", "info",
                        f"AI analysis completed via {telemetry.get('provider')}: calibrated {telemetry.get('calibrated_count')} finding(s), "
                        f"{telemetry.get('attack_chains_count')} attack chain(s) identified ({telemetry.get('latency_ms')}ms).")
                elif telemetry.get("error"):
                    log("ai_decision", "info", f"AI analysis fallback: {telemetry['error']}")
            except Exception as exc:
                logger.warning("AI findings analysis error: %s", exc)
                log("ai_decision", "warning", f"AI findings analysis fallback: {exc}")

        return EvidenceAnalysisService.record(db, scan_id, asset, drafts)

    @staticmethod
    def analyze_and_record_findings(db: Session, scan_id: uuid.UUID, target_asset: str, intel=None) -> List[Finding]:
        """Synchronous wrapper (scripts / tests)."""
        return asyncio.run(EvidenceAnalysisService.run_pipeline(
            db, scan_id, target_asset, lambda *a: logger.info("%s", a[-1]), intel=intel))
