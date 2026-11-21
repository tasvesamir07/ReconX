import asyncio
import logging
import time
import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.scan import Scan, ScanEvent, CheckRun
from app.models.evidence import Evidence
from app.models.authorization import ApprovedAsset
from app.models.base import utc_now
from app.workers.capabilities import CapabilityRegistry, compute_hash
from app.workers.sandbox import SandboxExecutionEngine
from app.workers.kali_orchestrator import KaliWorkerOrchestrator
from app.ai.client import ai_client
from app.services.policy_engine import PolicyEngine
from app.services.evidence_service import EvidenceAnalysisService
from app.services.report_service import ReportGeneratorService
from app.services.audit_service import AuditService

logger = logging.getLogger("reconx.scan.executor")

async def execute_scan_job(scan_id: uuid.UUID, db_session: Session = None):
    """
    Background worker orchestrator executing an approved scan.
    Runs the adaptive AI check loop, policy checks, sandbox runs, evidence collection, and report synthesis.
    """
    db: Session = db_session if db_session is not None else SessionLocal()
    should_close = db_session is None
    try:
        scan = db.query(Scan).filter(Scan.id == scan_id).first()
        if not scan or scan.status in ("cancelled", "completed", "failed"):
            return

        now = utc_now()
        scan.status = "running"
        scan.started_at = now
        db.commit()

        # Log start event
        _log_event(db, scan.id, "lifecycle", "info", f"Assessment worker active. Running checks for preset '{scan.preset}'")

        asset = db.query(ApprovedAsset).filter(ApprovedAsset.id == scan.approved_asset_id).first()
        canonical_host, resolved_ip = PolicyEngine.validate_target_against_asset(scan.target_url, asset)
        scan.resolved_ip = resolved_ip
        db.commit()

        AuditService.log(
            db, "scan.started", "scan", str(scan.id),
            actor_id=scan.requested_by, organization_id=scan.organization_id,
            metadata_json={"target": scan.target_url, "preset": scan.preset, "resolved_ip": resolved_ip}
        )

        # 1. Attempt Execution in Kali Linux Worker Sandbox (WSL2 / Linux Container)
        kali_success = False
        if KaliWorkerOrchestrator.is_kali_available():
            logger.info(f"Kali Linux WSL2 detected. Dispatching scan {scan.id} to Kali Worker.")
            kali_success = await KaliWorkerOrchestrator.execute_kali_scan(
                db=db,
                scan=scan,
                asset=asset,
                canonical_host=canonical_host,
                resolved_ip=resolved_ip
            )

        # 2. Fallback to In-Process Sandbox Execution Engine if Kali was unavailable
        db.refresh(scan)
        if not kali_success and scan.status != "cancelled":
            _log_event(db, scan.id, "lifecycle", "info", "Running assessment in local sandboxed execution engine.")
            allowed_caps = CapabilityRegistry.list_available(asset.permitted_categories)
            completed_check_ids = []
            evidence_summary = []

            time_budget = scan.budget_seconds_snapshot or (600 if scan.preset == "ultimate" else (300 if scan.preset == "moderate" else 60))
            scan_start_time = time.time()
            cycle = 0

            while True:
                cycle += 1
                elapsed = time.time() - scan_start_time
                if elapsed >= time_budget - 2:
                    _log_event(db, scan.id, "lifecycle", "info", f"Allocated time budget ({time_budget}s) elapsed after {cycle-1} cycles. Finalizing findings.")
                    break

                # Refresh scan to verify no user cancellation occurred
                db.refresh(scan)
                if scan.status == "cancelled":
                    _log_event(db, scan.id, "lifecycle", "warning", "Scan stopped due to user cancellation.")
                    return

                # AI Planner proposes next check
                decision = await ai_client.plan_next_step(
                    db=db,
                    scan_id=scan.id,
                    target_url=scan.target_url,
                    canonical_host=canonical_host,
                    preset=scan.preset,
                    allowed_capabilities=allowed_caps,
                    completed_checks=completed_check_ids,
                    evidence_summary=evidence_summary
                )

                if decision.decision == "complete":
                    _log_event(db, scan.id, "ai_decision", "info", f"AI Planner concluded: {decision.rationale}")
                    break

                capability_id = decision.capability_id
                if not capability_id or capability_id in completed_check_ids:
                    remaining = [c["capability_id"] for c in allowed_caps if c["capability_id"] not in completed_check_ids]
                    if not remaining:
                        break
                    capability_id = remaining[0]

                # Independent Backend Policy Engine Check
                PolicyEngine.validate_capability_for_asset(capability_id, asset)

                # Record Check Run
                check_run = CheckRun(
                    scan_id=scan.id,
                    capability_id=capability_id,
                    status="running",
                    started_at=utc_now()
                )
                db.add(check_run)
                db.commit()
                db.refresh(check_run)

                _log_event(db, scan.id, "check_start", "info", f"Executing check: {capability_id} ({decision.rationale})")

                # Execute in Isolated Sandbox
                success, raw_evidence, summary = await SandboxExecutionEngine.execute_check(
                    capability_id=capability_id,
                    target_url=scan.target_url,
                    canonical_host=canonical_host,
                    resolved_ip=resolved_ip,
                    timeout_seconds=20
                )

                check_run.status = "success" if success else "failed"
                check_run.finished_at = utc_now()
                check_run.exit_code = 0 if success else 1
                check_run.output_summary = summary
                db.commit()

                # Store Evidence
                ev_record = Evidence(
                    scan_id=scan.id,
                    check_run_id=check_run.id,
                    evidence_type=capability_id,
                    normalized_data=raw_evidence,
                    source="reconx.worker.sandbox",
                    confidence=decision.confidence,
                    content_hash=compute_hash(raw_evidence),
                    observed_at=utc_now()
                )
                db.add(ev_record)
                db.commit()

                completed_check_ids.append(capability_id)
                evidence_summary.append({"capability": capability_id, "summary": summary})

                _log_event(db, scan.id, "check_complete", "info", f"Check {capability_id} finished: {summary}")

        # Check if cancelled during run
        db.refresh(scan)
        if scan.status == "cancelled":
            return

        # Finalize Scan: Synthesize Findings & Report
        _log_event(db, scan.id, "lifecycle", "info", "Security checks concluded. Deriving evidence-backed findings.")
        EvidenceAnalysisService.analyze_and_record_findings(db, scan.id, canonical_host)

        _log_event(db, scan.id, "lifecycle", "info", "Generating cryptographic audit report and PDF artifact.")
        ReportGeneratorService.generate_report(db, scan.id)

        scan.status = "completed"
        scan.finished_at = utc_now()
        db.commit()

        AuditService.log(
            db, "scan.completed", "scan", str(scan.id),
            actor_id=scan.requested_by, organization_id=scan.organization_id,
            metadata_json={"target": scan.target_url, "preset": scan.preset, "status": "completed"}
        )

        _log_event(db, scan.id, "lifecycle", "info", "Assessment finished successfully.")

    except Exception as e:
        logger.error(f"Scan execution error on scan {scan_id}: {str(e)}", exc_info=True)
        if scan:
            scan.status = "failed"
            scan.finished_at = utc_now()
            db.commit()
            _log_event(db, scan.id, "error", "critical", f"Scan failed unexpectedly: {str(e)}")
    finally:
        if should_close:
            db.close()

def _log_event(db: Session, scan_id: uuid.UUID, event_type: str, severity: str, message: str):
    count = db.query(ScanEvent).filter(ScanEvent.scan_id == scan_id).count()
    ev = ScanEvent(
        scan_id=scan_id,
        sequence_number=count + 1,
        event_type=event_type,
        severity=severity,
        message=message,
        created_at=utc_now()
    )
    db.add(ev)
    db.commit()
