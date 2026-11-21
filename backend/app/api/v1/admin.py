from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.database import get_db, engine
from app.models.user import User
from app.models.audit import AuditEvent, WorkerInstance
from app.api.deps import require_platform_role
from app.core.constants import PRESET_BUDGETS, PRESET_MAX_CONCURRENCY
from app.config import settings

router = APIRouter(prefix="/admin", tags=["Administration"])

@router.get("/health")
def get_system_health(
    admin: User = Depends(require_platform_role("SUPER_ADMIN")),
    db: Session = Depends(get_db)
):
    # Check database connectivity
    db_ok = True
    try:
        with engine.connect() as conn:
            conn.execute("SELECT 1")
    except Exception:
        db_ok = False

    return {
        "status": "healthy" if db_ok else "degraded",
        "database_connected": db_ok,
        "ai_primary_provider": settings.AI_PRIMARY_PROVIDER,
        "ai_fallback_provider": settings.AI_FALLBACK_PROVIDER,
        "worker_concurrency_limit": settings.WORKER_MAX_CONCURRENCY,
        "active_environment": settings.APP_ENV
    }

@router.get("/workers")
def list_workers(
    admin: User = Depends(require_platform_role("SUPER_ADMIN")),
    db: Session = Depends(get_db)
):
    return db.query(WorkerInstance).all()

@router.get("/audit-events")
def list_audit_events(
    limit: int = 150,
    admin: User = Depends(require_platform_role("SUPER_ADMIN")),
    db: Session = Depends(get_db)
):
    events = db.query(AuditEvent).order_by(AuditEvent.created_at.desc()).limit(limit).all()
    results = []
    for ev in events:
        actor_name = ev.actor.display_name if ev.actor else "System Automated"
        actor_email = ev.actor.email if ev.actor else None
        org_name = ev.organization.name if ev.organization else "Platform / Solo"
        results.append({
            "id": str(ev.id),
            "action": ev.action,
            "actor_id": str(ev.actor_id) if ev.actor_id else None,
            "actor_name": actor_name,
            "actor_email": actor_email,
            "organization_id": str(ev.organization_id) if ev.organization_id else None,
            "organization_name": org_name,
            "resource_type": ev.resource_type,
            "resource_id": str(ev.resource_id),
            "decision": ev.decision,
            "reason": ev.reason,
            "ip_address": ev.ip_address,
            "metadata": ev.metadata_json,
            "created_at": ev.created_at.isoformat() if ev.created_at else None
        })
    return results

@router.get("/policies")
def get_scan_policies(
    admin: User = Depends(require_platform_role("SUPER_ADMIN"))
):
    return {
        "presets": {
            k.value: {
                "budget_seconds": PRESET_BUDGETS[k],
                "max_concurrency": PRESET_MAX_CONCURRENCY[k]
            }
            for k in PRESET_BUDGETS
        },
        "max_worker_concurrency": settings.WORKER_MAX_CONCURRENCY,
        "default_timeout_seconds": settings.WORKER_DEFAULT_TIMEOUT_SECONDS
    }

@router.post("/emergency-kill-all")
def emergency_kill_all_scans(
    admin: User = Depends(require_platform_role("SUPER_ADMIN")),
    db: Session = Depends(get_db)
):
    """
    Emergency Global Kill-Switch: Halts all active and pending scans across all tenants.
    Drops cancel.flag into all worker job directories.
    """
    import os
    from app.models.scan import Scan, ScanEvent
    from app.models.base import utc_now

    active_scans = db.query(Scan).filter(Scan.status.in_(["running", "pending", "queued"])).all()
    count = 0
    base_jobs_dir = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "workers", "jobs"))
    now = utc_now()

    for s in active_scans:
        s.status = "cancelled"
        s.cancelled_at = now
        count += 1
        short_id = str(s.id)[:8]
        job_dir = os.path.join(base_jobs_dir, f"job_{short_id}")
        if os.path.exists(job_dir):
            try:
                with open(os.path.join(job_dir, "cancel.flag"), "w", encoding="utf-8") as f:
                    f.write("cancelled")
            except Exception:
                pass

        ev_count = db.query(ScanEvent).filter(ScanEvent.scan_id == s.id).count()
        db.add(ScanEvent(
            scan_id=s.id,
            sequence_number=ev_count + 1,
            event_type="lifecycle",
            severity="warning",
            message="Assessment terminated by emergency platform kill-switch.",
            metadata_json={"cancelled_by": str(admin.id), "reason": "emergency_global_kill"}
        ))

    db.commit()
    return {"status": "success", "terminated_scans": count, "message": f"Successfully terminated {count} active assessment workers."}

@router.post("/purge-test-scans")
def purge_test_scans(
    admin: User = Depends(require_platform_role("SUPER_ADMIN")),
    db: Session = Depends(get_db)
):
    """
    Purges completed, failed, and cancelled test scans and cleans up temporary job directories.
    Active running scans are NOT purged (they must be cancelled first).
    """
    import os, shutil
    from app.models.scan import Scan

    inactive_scans = db.query(Scan).filter(Scan.status.in_(["cancelled", "failed", "completed"])).all()
    count = len(inactive_scans)
    base_jobs_dir = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "workers", "jobs"))

    for s in inactive_scans:
        short_id = str(s.id)[:8]
        job_dir = os.path.join(base_jobs_dir, f"job_{short_id}")
        if os.path.exists(job_dir):
            try:
                shutil.rmtree(job_dir, ignore_errors=True)
            except Exception:
                pass
        db.delete(s)

    db.commit()
    return {
        "status": "success",
        "purged_count": count,
        "message": f"Purged {count} inactive test scans and cleaned temporary worker directories."
    }

@router.get("/organizations")
def list_all_organizations(
    admin: User = Depends(require_platform_role("SUPER_ADMIN")),
    db: Session = Depends(get_db)
):
    """
    Super Admin organization directory: returns all organizations on the platform with member count and scan count.
    """
    from app.models.organization import Organization, OrganizationMembership
    from app.models.scan import Scan

    orgs = db.query(Organization).order_by(Organization.created_at.desc()).all()
    results = []
    for org in orgs:
        member_count = db.query(OrganizationMembership).filter(
            OrganizationMembership.organization_id == org.id,
            OrganizationMembership.status == "active"
        ).count()
        scan_count = db.query(Scan).filter(Scan.organization_id == org.id).count()
        results.append({
            "id": str(org.id),
            "name": org.name,
            "slug": org.slug,
            "status": org.status,
            "created_at": org.created_at.isoformat() if org.created_at else None,
            "member_count": member_count,
            "scan_count": scan_count,
        })
    return results

@router.get("/organizations/{org_id}/members")
def list_organization_members_admin(
    org_id: str,
    admin: User = Depends(require_platform_role("SUPER_ADMIN")),
    db: Session = Depends(get_db)
):
    """
    Super Admin view of members in a specific organization.
    """
    import uuid
    from app.models.organization import OrganizationMembership
    from app.core.exceptions import NotFoundError

    try:
        org_uuid = uuid.UUID(org_id)
    except ValueError:
        raise NotFoundError("Invalid organization ID.")

    memberships = db.query(OrganizationMembership).filter(
        OrganizationMembership.organization_id == org_uuid
    ).all()

    return [
        {
            "id": str(m.id),
            "user_id": str(m.user.id),
            "email": m.user.email,
            "display_name": m.user.display_name,
            "role": m.role,
            "status": m.status,
            "joined_at": m.joined_at.isoformat() if m.joined_at else None,
        }
        for m in memberships
    ]

@router.get("/users")
def list_all_users(
    admin: User = Depends(require_platform_role("SUPER_ADMIN")),
    db: Session = Depends(get_db)
):
    """
    Super Admin platform user directory: inspect all users, their security roles, status, and activity footprint.
    """
    from app.models.user import User
    from app.models.organization import OrganizationMembership
    from app.models.scan import Scan

    users = db.query(User).order_by(User.created_at.desc()).all()
    results = []
    for u in users:
        orgs = db.query(OrganizationMembership).filter(
            OrganizationMembership.user_id == u.id,
            OrganizationMembership.status == "active"
        ).all()
        scan_count = db.query(Scan).filter(Scan.requested_by == u.id).count()
        results.append({
            "id": str(u.id),
            "email": u.email,
            "display_name": u.display_name,
            "phone_number": u.phone_number,
            "avatar_url": u.avatar_url,
            "bio": u.bio,
            "platform_role": u.platform_role,
            "status": u.status,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "email_verified_at": u.email_verified_at.isoformat() if u.email_verified_at else None,
            "organizations": [
                {"id": str(m.organization.id), "name": m.organization.name, "role": m.role}
                for m in orgs
            ],
            "total_scans": scan_count,
        })
    return results

@router.get("/execution-logs")
def list_execution_logs(
    limit: int = 100,
    admin: User = Depends(require_platform_role("SUPER_ADMIN")),
    db: Session = Depends(get_db)
):
    """
    Super Admin Platform Execution Logs:
    Complete multi-month operational records of all assessments run across the platform.
    Includes operator identity, organization, target, preset, duration, status, and raw event telemetry.
    """
    from app.models.scan import Scan, ScanEvent
    from app.models.finding import Finding
    from app.models.user import User
    from app.models.organization import Organization

    scans = db.query(Scan).order_by(Scan.created_at.desc()).limit(limit).all()
    results = []
    for s in scans:
        requester = db.query(User).filter(User.id == s.requested_by).first()
        org = db.query(Organization).filter(Organization.id == s.organization_id).first() if s.organization_id else None
        events = db.query(ScanEvent).filter(ScanEvent.scan_id == s.id).order_by(ScanEvent.sequence_number.asc()).all()
        findings_count = db.query(Finding).filter(Finding.scan_id == s.id).count()

        duration_seconds = None
        if s.started_at and s.finished_at:
            duration_seconds = round((s.finished_at - s.started_at).total_seconds(), 1)
        elif s.started_at:
            from app.models.base import utc_now
            duration_seconds = round((utc_now() - s.started_at).total_seconds(), 1)

        results.append({
            "id": str(s.id),
            "target_url": s.target_url,
            "resolved_ip": s.resolved_ip,
            "preset": s.preset,
            "status": s.status,
            "budget_seconds": s.budget_seconds_snapshot,
            "duration_seconds": duration_seconds,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "started_at": s.started_at.isoformat() if s.started_at else None,
            "finished_at": s.finished_at.isoformat() if s.finished_at else None,
            "cancelled_at": s.cancelled_at.isoformat() if s.cancelled_at else None,
            "operator": {
                "id": str(requester.id) if requester else None,
                "display_name": requester.display_name if requester else "Deleted Operator",
                "email": requester.email if requester else "unknown",
                "phone_number": requester.phone_number if requester else None,
                "platform_role": requester.platform_role if requester else "USER",
            },
            "organization": {
                "id": str(org.id) if org else None,
                "name": org.name if org else "Personal Workspace (Freelancer)",
                "slug": org.slug if org else None,
            },
            "findings_count": findings_count,
            "events_count": len(events),
            "recent_events": [
                {
                    "seq": ev.sequence_number,
                    "type": ev.event_type,
                    "severity": ev.severity,
                    "message": ev.message,
                    "created_at": ev.created_at.isoformat() if ev.created_at else None,
                }
                for ev in events
            ]
        })
    return results

@router.post("/users/{user_id}/toggle-status")
def toggle_user_status(
    user_id: str,
    admin: User = Depends(require_platform_role("SUPER_ADMIN")),
    db: Session = Depends(get_db)
):
    """
    Super Admin control: Suspend or re-activate a user account immediately blocking login and active sessions.
    """
    import uuid
    from app.models.user import User
    from app.services.audit_service import AuditService
    from app.core.exceptions import NotFoundError, PolicyViolationError

    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise NotFoundError("Invalid user ID.")

    target = db.query(User).filter(User.id == user_uuid).first()
    if not target:
        raise NotFoundError("User not found.")

    if target.platform_role == "SUPER_ADMIN" and target.id == admin.id:
        raise PolicyViolationError("SELF_SUSPENSION", "Super Admin cannot suspend their own account.")

    new_status = "suspended" if target.status == "active" else "active"
    target.status = new_status
    db.commit()

    AuditService.log(
        db, "admin.user_status_changed", "user", str(target.id),
        actor_id=admin.id, metadata_json={"new_status": new_status, "user_email": target.email}
    )
    return {
        "status": "success",
        "user_id": str(target.id),
        "account_status": new_status,
        "message": f"Account for {target.email} is now {new_status}."
    }

