import asyncio
import json
import logging
import uuid
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.scan import Scan, ScanEvent
from app.models.evidence import Evidence
from app.models.finding import Finding
from app.models.authorization import ApprovedAsset
from app.models.audit import AIProviderEvent
from app.models.base import utc_now
from app.workers.kali_orchestrator import KaliWorkerOrchestrator
from app.services.policy_engine import PolicyEngine
from app.services.evidence_service import EvidenceAnalysisService
from app.services.report_service import ReportGeneratorService
from app.services.audit_service import AuditService

logger = logging.getLogger("reconx.scan.executor")


def _coverage_note(db: Session, scan_id: uuid.UUID) -> str:
    """Plain statement of what did not run, so reports never imply more coverage than they had."""
    manifest = (
        db.query(Evidence)
        .filter(Evidence.scan_id == scan_id, Evidence.evidence_type == "engine.manifest")
        .first()
    )
    if not manifest:
        return ""
    outcomes = (manifest.normalized_data or {}).get("outcomes", [])
    skipped = [o for o in outcomes if o.get("status") != "ok"]
    if not skipped:
        return f"Coverage: all {len(outcomes)} planned checks completed."
    names = "; ".join(f"{o.get('title')} ({o.get('reason') or o.get('status')})" for o in skipped[:4])
    return f"Coverage: {len(outcomes) - len(skipped)} of {len(outcomes)} planned checks completed. Not completed: {names}."


async def execute_scan_job(scan_id: uuid.UUID, db_session: Session = None):
    """
    Runs an approved scan: policy re-validation -> deterministic scan engine ->
    findings pipeline (rules + NVD/OSV + KEV/EPSS) -> executive summary -> PDF report.
    """
    db: Session = db_session if db_session is not None else SessionLocal()
    should_close = db_session is None
    scan = None
    try:
        scan = db.query(Scan).filter(Scan.id == scan_id).first()
        if not scan or scan.status in ("cancelled", "completed", "failed"):
            return

        scan.status = "running"
        scan.started_at = utc_now()
        db.commit()
        _log_event(db, scan.id, "lifecycle", "info", f"Assessment started with preset '{scan.preset}'.")

        asset = db.query(ApprovedAsset).filter(ApprovedAsset.id == scan.approved_asset_id).first()
        canonical_host, resolved_ip = PolicyEngine.validate_target_against_asset(scan.target_url, asset)
        scan.resolved_ip = resolved_ip
        db.commit()

        AuditService.log(
            db, "scan.started", "scan", str(scan.id),
            actor_id=scan.requested_by, organization_id=scan.organization_id,
            metadata_json={"target": scan.target_url, "preset": scan.preset, "resolved_ip": resolved_ip}
        )

        ok = await KaliWorkerOrchestrator.execute_kali_scan(
            db=db, scan=scan, asset=asset, canonical_host=canonical_host, resolved_ip=resolved_ip
        )

        db.refresh(scan)
        if scan.status == "cancelled":
            return
        if not ok:
            scan.status = "failed"
            scan.finished_at = utc_now()
            db.commit()
            _log_event(db, scan.id, "error", "critical", "The scan engine produced no evidence; assessment marked as failed.")
            return

        _log_event(db, scan.id, "lifecycle", "info", "Checks finished. Deriving findings from evidence.")
        await EvidenceAnalysisService.run_pipeline(
            db, scan.id, canonical_host, lambda t, s, m: _log_event(db, scan.id, t, s, m)
        )

        findings = db.query(Finding).filter(Finding.scan_id == scan.id).all()
        from app.ai import summary as ai_summary
        summary, telemetry = await asyncio.to_thread(
            ai_summary.generate, findings, canonical_host, _coverage_note(db, scan.id)
        )
        scan.summary_notes = json.dumps(summary)
        db.commit()
        if telemetry.get("provider"):
            db.add(AIProviderEvent(
                scan_id=scan.id, provider=telemetry["provider"].split(":")[0], model=telemetry["provider"].split(":", 1)[-1],
                operation="executive_summary", status="success" if telemetry["success"] else "failed",
                latency_ms=telemetry.get("latency_ms") or 0, error_code=(telemetry.get("error") or None) and telemetry["error"][:100],
                created_at=utc_now(),
            ))
            db.commit()
        _log_event(db, scan.id, "ai_summary", "info" if summary["source"] == "ai" else "low",
                   "Executive summary written by AI and validated against findings." if summary["source"] == "ai"
                   else f"Executive summary generated deterministically ({telemetry.get('error') or 'AI not used'}).")

        _log_event(db, scan.id, "lifecycle", "info", "Generating PDF report.")
        ReportGeneratorService.generate_report(db, scan.id)

        scan.status = "completed"
        scan.finished_at = utc_now()
        db.commit()

        AuditService.log(
            db, "scan.completed", "scan", str(scan.id),
            actor_id=scan.requested_by, organization_id=scan.organization_id,
            metadata_json={"target": scan.target_url, "preset": scan.preset, "status": "completed"}
        )
        _log_event(db, scan.id, "lifecycle", "info", f"Assessment finished: {len(findings)} finding(s).")

    except Exception as e:
        logger.error(f"Scan execution error on scan {scan_id}: {str(e)}", exc_info=True)
        if scan:
            db.rollback()
            scan.status = "failed"
            scan.finished_at = utc_now()
            db.commit()
            _log_event(db, scan.id, "error", "critical", f"Scan failed unexpectedly: {str(e)}")
    finally:
        if should_close:
            db.close()


def _log_event(db: Session, scan_id: uuid.UUID, event_type: str, severity: str, message: str):
    count = db.query(ScanEvent).filter(ScanEvent.scan_id == scan_id).count()
    db.add(ScanEvent(
        scan_id=scan_id, sequence_number=count + 1, event_type=event_type,
        severity=severity, message=message, created_at=utc_now()
    ))
    db.commit()
