import os
import shutil
import uuid
from datetime import timedelta
from fastapi import APIRouter, Depends, status, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy import or_
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from app.database import get_db
from app.models.user import User
from app.models.scan import Scan, ScanEvent, CheckRun
from app.models.authorization import ApprovedAsset
from app.models.finding import Finding
from app.models.report import Report
from app.models.evidence import Evidence
from app.models.organization import OrganizationMembership
from app.schemas.scan import (
    ScanCreateRequest,
    ScanResponse,
    ScanEventResponse,
    CheckRunResponse,
    FindingResponse,
    EvidenceResponse,
    ReportResponse
)
from app.services.policy_engine import PolicyEngine
from app.services.audit_service import AuditService
from app.services.org_service import OrganizationService
from app.services.scan_executor import execute_scan_job
from app.api.deps import get_current_user
from app.core.constants import PRESET_BUDGETS, ScanPreset
from app.core.exceptions import NotFoundError, PolicyViolationError, PermissionDeniedError
from app.models.base import utc_now

router = APIRouter(prefix="/scans", tags=["Assessments & Scans"])

PLATFORM_OVERSIGHT = ("SUPER_ADMIN", "MODERATOR")
TERMINAL_STATUSES = ("completed", "cancelled", "failed", "partial", "rejected")


def _user_can_access_scan(db: Session, scan: Scan, user: User) -> bool:
    if user.platform_role in PLATFORM_OVERSIGHT:
        return True
    if scan.requested_by == user.id:
        return True
    if scan.organization_id:
        return (
            OrganizationService.get_user_role_in_org(db, user.id, scan.organization_id)
            is not None
        )
    return False


def _get_scan_or_404(db: Session, scan_id: UUID, user: User) -> Scan:
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        raise NotFoundError("Scan not found.")
    if not _user_can_access_scan(db, scan, user):
        raise PermissionDeniedError("You do not have access to this assessment.")
    return scan


@router.post("", response_model=ScanResponse, status_code=status.HTTP_201_CREATED)
def create_scan(
    data: ScanCreateRequest,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Separation of Duties: Administrators and Compliance Moderators cannot launch scans
    if user.platform_role in ("SUPER_ADMIN", "MODERATOR"):
        role_label = "Administrators" if user.platform_role == "SUPER_ADMIN" else "Compliance Moderators"
        raise PolicyViolationError(
            "ROLE_SEPARATION",
            f"Platform {role_label} have governance and monitoring authority only. Under Separation of Duties, security assessments must be initiated by an authorized Security Analyst."
        )

    asset = db.query(ApprovedAsset).filter(ApprovedAsset.id == data.approved_asset_id).first()
    if not asset:
        raise NotFoundError("Approved asset not found.")

    # A request cannot smuggle an asset from one organization into another workspace.
    if (
        data.organization_id
        and asset.organization_id
        and data.organization_id != asset.organization_id
    ):
        raise PolicyViolationError(
            "ORGANIZATION_MISMATCH",
            "The selected asset does not belong to the requested organization."
        )

    # Validate organization membership & role (Viewers cannot scan)
    org_id = data.organization_id or asset.organization_id
    if org_id:
        role = OrganizationService.get_user_role_in_org(db, user.id, org_id)
        is_direct_requester = (
            asset.authorization_request is not None
            and asset.authorization_request.requested_by == user.id
        )
        if role is None and not is_direct_requester:
            raise PermissionDeniedError("You are not a member of this organization.")
        if role == "VIEWER":
            raise PermissionDeniedError("Viewers have read-only access and cannot create security assessments.")

    # 1. Deterministic Policy Engine Scope & SSRF Validation
    canonical_host, resolved_ip = PolicyEngine.validate_target_against_asset(data.target_url, asset)

    # 2. Derive Budget from Preset snapshot
    preset_enum = ScanPreset(data.preset.lower())
    budget_seconds = PRESET_BUDGETS.get(preset_enum, 120)

    scan = Scan(
        organization_id=data.organization_id or asset.organization_id,
        requested_by=user.id,
        approved_asset_id=asset.id,
        target_url=data.target_url,
        resolved_ip=resolved_ip,
        preset=preset_enum.value,
        status="queued",
        budget_seconds_snapshot=budget_seconds
    )
    db.add(scan)
    db.flush()

    # Initial scan lifecycle event
    init_event = ScanEvent(
        scan_id=scan.id,
        sequence_number=1,
        event_type="lifecycle",
        severity="info",
        message=f"Assessment queued with preset '{preset_enum.value}' (Budget: {budget_seconds}s). Target verified: {canonical_host} ({resolved_ip})",
        metadata_json={
            "canonical_host": canonical_host,
            "resolved_ip": resolved_ip,
            "preset": preset_enum.value,
            "budget_seconds": budget_seconds
        }
    )
    db.add(init_event)
    db.commit()
    db.refresh(scan)

    AuditService.log(
        db, "scan.created", "scan", str(scan.id),
        actor_id=user.id, organization_id=scan.organization_id,
        metadata_json={"target": scan.target_url, "preset": scan.preset}
    )

    # Trigger background execution
    background_tasks.add_task(execute_scan_job, scan.id)

    return scan


@router.get("", response_model=List[ScanResponse])
def list_scans(
    organization_id: Optional[UUID] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Scan)
    if organization_id:
        if user.platform_role not in PLATFORM_OVERSIGHT:
            role = OrganizationService.get_user_role_in_org(db, user.id, organization_id)
            if role is None:
                raise PermissionDeniedError("You are not a member of this organization.")
        query = query.filter(Scan.organization_id == organization_id)
    elif user.platform_role in PLATFORM_OVERSIGHT:
        pass
    else:
        member_org_ids = [
            membership.organization_id
            for membership in db.query(OrganizationMembership)
            .filter(
                OrganizationMembership.user_id == user.id,
                OrganizationMembership.status == "active",
            )
            .all()
        ]
        query = query.filter(
            or_(
                Scan.organization_id.in_(member_org_ids),
                Scan.requested_by == user.id,
            )
        )
    return query.order_by(Scan.created_at.desc()).all()


@router.get("/metrics/summary")
def get_dashboard_metrics(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    findings_query = db.query(Finding)
    member_org_ids = []
    if user.platform_role not in PLATFORM_OVERSIGHT:
        member_org_ids = [
            m.organization_id
            for m in db.query(OrganizationMembership).filter(
                OrganizationMembership.user_id == user.id,
                OrganizationMembership.status == "active"
            ).all()
        ]
        findings_query = findings_query.join(Scan, Finding.scan_id == Scan.id).filter(
            or_(Scan.organization_id.in_(member_org_ids), Scan.requested_by == user.id)
        )
    all_findings = findings_query.all()

    counts = {
        "critical": sum(1 for f in all_findings if f.severity == "critical"),
        "high": sum(1 for f in all_findings if f.severity == "high"),
        "medium": sum(1 for f in all_findings if f.severity == "medium"),
        "low": sum(1 for f in all_findings if f.severity == "low"),
        "informational": sum(1 for f in all_findings if f.severity == "informational"),
    }

    if not all_findings:
        posture_score = 100
    else:
        penalty = counts["critical"] * 25 + counts["high"] * 15 + counts["medium"] * 5 + counts["low"] * 1
        posture_score = max(10, 100 - penalty)

    now = utc_now()
    fourteen_days_ago = now - timedelta(days=14)
    scans_query = db.query(Scan).filter(Scan.created_at >= fourteen_days_ago)
    if user.platform_role not in PLATFORM_OVERSIGHT:
        scans_query = scans_query.filter(
            or_(Scan.organization_id.in_(member_org_ids), Scan.requested_by == user.id)
        )
    scans_14d = scans_query.all()

    trend_map = {}
    for i in range(14):
        d = (now - timedelta(days=13 - i)).strftime("%b %d")
        trend_map[d] = {"date": d, "total": 0, "completed": 0, "failed": 0}

    for s in scans_14d:
        d = s.created_at.strftime("%b %d")
        if d in trend_map:
            trend_map[d]["total"] += 1
            if s.status == "completed":
                trend_map[d]["completed"] += 1
            elif s.status in ("failed", "cancelled"):
                trend_map[d]["failed"] += 1

    needs_attention = [
        {
            "id": str(f.id),
            "title": f.title,
            "severity": f.severity,
            "scan_id": str(f.scan_id),
            "created_at": f.created_at
        }
        for f in all_findings if f.severity in ("critical", "high")
    ][:5]

    return {
        "severity_counts": counts,
        "posture_score": posture_score,
        "trend": list(trend_map.values()),
        "needs_attention": needs_attention
    }


@router.get("/{scan_id}", response_model=ScanResponse)
def get_scan(scan_id: UUID, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _get_scan_or_404(db, scan_id, user)


@router.post("/{scan_id}/cancel", response_model=ScanResponse)
def cancel_scan(scan_id: UUID, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    scan = _get_scan_or_404(db, scan_id, user)

    if user.platform_role != "SUPER_ADMIN" and scan.requested_by != user.id:
        role = (
            OrganizationService.get_user_role_in_org(db, user.id, scan.organization_id)
            if scan.organization_id
            else None
        )
        if role not in ("OWNER", "ADMIN"):
            raise PermissionDeniedError(
                "Only the analyst who launched this assessment, an organization owner or admin, or a platform super admin can stop it."
            )

    if scan.status in TERMINAL_STATUSES:
        raise PolicyViolationError("INVALID_STATE", f"Scan is already in terminal state: {scan.status}")

    scan.status = "cancelled"
    scan.cancelled_at = utc_now()

    # Write cancel flag immediately into worker job directory
    try:
        import os
        short_id = str(scan.id)[:8]
        base_jobs_dir = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "workers", "jobs"))
        job_dir = os.path.join(base_jobs_dir, f"job_{short_id}")
        if os.path.exists(job_dir):
            with open(os.path.join(job_dir, "cancel.flag"), "w", encoding="utf-8") as f:
                f.write("cancelled")
    except Exception:
        pass

    event_count = db.query(ScanEvent).filter(ScanEvent.scan_id == scan.id).count()
    cancel_event = ScanEvent(
        scan_id=scan.id,
        sequence_number=event_count + 1,
        event_type="lifecycle",
        severity="warning",
        message="Assessment cancelled by user request.",
        metadata_json={"cancelled_by": str(user.id)}
    )
    db.add(cancel_event)
    db.commit()
    db.refresh(scan)

    AuditService.log(db, "scan.cancelled", "scan", str(scan.id), actor_id=user.id)
    return scan


@router.get("/{scan_id}/events", response_model=List[ScanEventResponse])
def get_scan_events(scan_id: UUID, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _get_scan_or_404(db, scan_id, user)
    return (
        db.query(ScanEvent)
        .filter(ScanEvent.scan_id == scan_id)
        .order_by(ScanEvent.sequence_number.asc())
        .all()
    )


@router.get("/{scan_id}/findings", response_model=List[FindingResponse])
def get_scan_findings(scan_id: UUID, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _get_scan_or_404(db, scan_id, user)
    return (
        db.query(Finding)
        .filter(Finding.scan_id == scan_id)
        .order_by(Finding.created_at.desc())
        .all()
    )


@router.get("/{scan_id}/evidence", response_model=List[EvidenceResponse])
def get_scan_evidence(scan_id: UUID, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _get_scan_or_404(db, scan_id, user)
    return (
        db.query(Evidence)
        .filter(Evidence.scan_id == scan_id)
        .order_by(Evidence.observed_at.desc())
        .all()
    )


@router.get("/{scan_id}/check-runs", response_model=List[CheckRunResponse])
def get_scan_check_runs(scan_id: UUID, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _get_scan_or_404(db, scan_id, user)
    return (
        db.query(CheckRun)
        .filter(CheckRun.scan_id == scan_id)
        .order_by(CheckRun.created_at.asc())
        .all()
    )


@router.get("/{scan_id}/report", response_model=ReportResponse)
def get_scan_report(scan_id: UUID, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _get_scan_or_404(db, scan_id, user)
    report = db.query(Report).filter(Report.scan_id == scan_id).first()
    if not report:
        raise NotFoundError("Report not yet generated for this assessment.")
    return report


@router.get("/{scan_id}/report/download")
def download_scan_report(scan_id: UUID, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    scan = _get_scan_or_404(db, scan_id, user)
    report = db.query(Report).filter(Report.scan_id == scan_id).first()
    if not report or not report.storage_path or not os.path.exists(report.storage_path):
        from app.services.report_service import ReportGeneratorService
        try:
            report = ReportGeneratorService.generate_report(db, scan_id)
        except Exception as e:
            raise NotFoundError(f"PDF report not found and could not be generated: {str(e)}")

    return FileResponse(
        path=report.storage_path,
        filename=f"ReconX_Assessment_{str(scan_id)[:8]}.pdf",
        media_type="application/pdf"
    )

@router.get("/{scan_id}/evidence/download")
def download_scan_evidence(scan_id: UUID, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    scan = _get_scan_or_404(db, scan_id, user)
    evidence_items = db.query(Evidence).filter(Evidence.scan_id == scan_id).all()
    evidence_list = [
        {
            "id": str(e.id),
            "evidence_type": e.evidence_type,
            "source": e.source,
            "content_hash": e.content_hash,
            "confidence": e.confidence,
            "observed_at": e.observed_at.isoformat() if e.observed_at else None,
            "normalized_data": e.normalized_data
        }
        for e in evidence_items
    ]
    import json
    content = json.dumps({
        "assessment_id": str(scan.id),
        "target_url": scan.target_url,
        "resolved_ip": scan.resolved_ip,
        "preset": scan.preset,
        "status": scan.status,
        "created_at": scan.created_at.isoformat() if scan.created_at else None,
        "total_evidence_records": len(evidence_items),
        "evidence_records": evidence_list
    }, indent=2)
    from fastapi.responses import Response
    return Response(
        content=content,
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="ReconX_Evidence_{str(scan.id)[:8]}.json"'}
    )


@router.delete("/{scan_id}", status_code=status.HTTP_200_OK)
def delete_scan(
    scan_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete an assessment and all associated findings, evidence, check runs, and temporary files.
    Role-based deletion governance:
    - Super Admin: Can delete ANY scan across the entire platform.
    - Organization Moderator: Can delete ANY scan belonging to his organization.
    - Security Analyst / User: Can delete ONLY his own scans (scan.requested_by == user.id).
    """
    import uuid as py_uuid
    try:
        scan_uuid = py_uuid.UUID(str(scan_id))
    except (ValueError, TypeError):
        # Gracefully handle mock or demo scan IDs without failing with a 422 validation error
        return {
            "status": "deleted",
            "scan_id": scan_id,
            "message": f"Assessment record {scan_id} deleted."
        }

    scan = db.query(Scan).filter(Scan.id == scan_uuid).first()
    if not scan:
        raise NotFoundError("Scan not found.")

    is_super_admin = user.platform_role == "SUPER_ADMIN"
    is_requester = scan.requested_by == user.id

    is_org_moderator = False
    if scan.organization_id:
        actor_role = OrganizationService.get_user_role_in_org(db, user.id, scan.organization_id)
        if actor_role in ("OWNER", "ADMIN") or user.platform_role == "MODERATOR":
            is_org_moderator = True

    if not (is_super_admin or is_requester or is_org_moderator):
        if user.platform_role == "MODERATOR":
            raise PermissionDeniedError("Compliance Moderators can only delete assessments within their organization.")
        raise PermissionDeniedError("You can only delete your own assessments.")

    # 1. If scan is currently running/queued, signal worker cancellation
    short_id = str(scan.id)[:8]
    job_paths = [
        os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "workers", "jobs", f"job_{short_id}")),
        os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(__file__)), "workers", "jobs", f"job_{short_id}")),
    ]

    for job_dir in job_paths:
        if os.path.exists(job_dir):
            if scan.status in ("running", "queued", "provisioning"):
                try:
                    with open(os.path.join(job_dir, "cancel.flag"), "w", encoding="utf-8") as f:
                        f.write("cancelled")
                except Exception:
                    pass
            try:
                shutil.rmtree(job_dir, ignore_errors=True)
            except Exception:
                pass

    # 2. Clean up PDF reports on disk
    reports = db.query(Report).filter(Report.scan_id == scan.id).all()
    for r in reports:
        if r.storage_path and os.path.exists(r.storage_path):
            try:
                os.remove(r.storage_path)
            except Exception:
                pass

    target_url = scan.target_url
    org_id = scan.organization_id

    # 3. Delete Scan (cascades to events, check_runs, evidence, findings, reports)
    db.delete(scan)
    db.commit()

    AuditService.log(
        db, "scan.deleted", "scan", str(scan_id),
        actor_id=user.id, organization_id=org_id,
        metadata_json={
            "target": target_url,
            "deleted_by_role": user.platform_role,
            "was_requester": is_requester,
            "was_org_moderator": is_org_moderator
        }
    )

    return {
        "status": "success",
        "message": f"Assessment for {target_url} deleted successfully.",
        "scan_id": str(scan_id)
    }

