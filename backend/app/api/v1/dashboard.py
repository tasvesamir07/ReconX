from datetime import timedelta
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.exceptions import NotFoundError, PermissionDeniedError
from app.database import get_db
from app.models.authorization import ApprovedAsset, AuthorizationRequest
from app.models.base import utc_now
from app.models.finding import Finding
from app.models.organization import Organization, OrganizationMembership
from app.models.scan import Scan
from app.models.user import User
from app.schemas.dashboard import (
    AttentionFinding,
    DashboardSummary,
    PostureSummary,
    RecentScan,
    SeverityDistribution,
    TrendPoint,
)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

ACTIVE_STATUSES = ("queued", "validating", "provisioning", "running", "stopping")
COMPLETED_STATUSES = ("completed", "partial")
SEVERITY_WEIGHTS = {
    "critical": 18,
    "high": 8,
    "medium": 3,
    "low": 1,
    "informational": 0.25,
}
SEVERITY_RANK = {"critical": 0, "high": 1, "medium": 2, "low": 3, "informational": 4}


def _resolve_scope(
    db: Session, user: User, organization_id: Optional[UUID]
) -> tuple[Optional[Organization], List[UUID], bool]:
    """Returns (selected organization, member org ids, platform-wide flag)."""
    memberships = (
        db.query(OrganizationMembership)
        .filter(
            OrganizationMembership.user_id == user.id,
            OrganizationMembership.status == "active",
        )
        .all()
    )
    member_org_ids = [membership.organization_id for membership in memberships]
    platform_wide = user.platform_role in ("SUPER_ADMIN", "MODERATOR")

    if organization_id is not None:
        organization = (
            db.query(Organization).filter(Organization.id == organization_id).first()
        )
        if not organization:
            raise NotFoundError("Organization not found.")
        if organization_id not in member_org_ids and not platform_wide:
            raise PermissionDeniedError("You are not a member of this organization.")
        return organization, member_org_ids, False

    if memberships:
        organization = memberships[0].organization
        return organization, member_org_ids, False

    return None, member_org_ids, platform_wide


def _scan_scope_filter(
    db: Session, user: User, organization: Optional[Organization], member_org_ids, platform_wide
):
    if organization is not None:
        return Scan.organization_id == organization.id
    if platform_wide:
        return None
    if member_org_ids:
        return or_(
            Scan.organization_id.in_(member_org_ids),
            Scan.requested_by == user.id,
        )
    return Scan.requested_by == user.id


def _posture_for(scan: Optional[Scan], findings: List[Finding]) -> PostureSummary:
    if scan is None:
        return PostureSummary(
            score=None,
            label="Not measured",
            scan_id=None,
            scan_date=None,
        )

    counts = SeverityDistribution()
    for finding in findings:
        if hasattr(counts, finding.severity):
            setattr(counts, finding.severity, getattr(counts, finding.severity) + 1)

    penalty = sum(
        SEVERITY_WEIGHTS.get(finding.severity, 0) for finding in findings
    )
    score = max(0, min(100, round(100 - penalty)))
    if score >= 90:
        label = "Strong"
    elif score >= 75:
        label = "Good"
    elif score >= 60:
        label = "Fair"
    elif score >= 40:
        label = "Weak"
    else:
        label = "Critical"

    return PostureSummary(
        score=score,
        label=label,
        scan_id=scan.id,
        scan_date=scan.finished_at or scan.created_at,
        critical=counts.critical,
        high=counts.high,
        medium=counts.medium,
        low=counts.low,
    )


@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary(
    organization_id: Optional[UUID] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    organization, member_org_ids, platform_wide = _resolve_scope(db, user, organization_id)
    scan_filter = _scan_scope_filter(db, user, organization, member_org_ids, platform_wide)

    scans_query = db.query(Scan)
    if scan_filter is not None:
        scans_query = scans_query.filter(scan_filter)
    scoped_scans = scans_query.all()
    scoped_scan_ids = [scan.id for scan in scoped_scans]

    now = utc_now()
    active_scans = sum(1 for scan in scoped_scans if scan.status in ACTIVE_STATUSES)
    completed_scans = sum(1 for scan in scoped_scans if scan.status == "completed")

    asset_query = db.query(ApprovedAsset).filter(
        ApprovedAsset.status == "active", ApprovedAsset.expires_at > now
    )
    if organization is not None:
        asset_query = asset_query.filter(ApprovedAsset.organization_id == organization.id)
    elif not platform_wide:
        asset_query = asset_query.filter(ApprovedAsset.organization_id.in_(member_org_ids))

    authorization_query = db.query(AuthorizationRequest)
    if organization is not None:
        authorization_query = authorization_query.filter(
            AuthorizationRequest.organization_id == organization.id
        )
    elif not platform_wide:
        authorization_query = authorization_query.filter(
            or_(
                AuthorizationRequest.organization_id.in_(member_org_ids),
                AuthorizationRequest.requested_by == user.id,
            )
        )

    total_findings = 0
    if scoped_scan_ids:
        total_findings = (
            db.query(func.count(Finding.id))
            .filter(Finding.scan_id.in_(scoped_scan_ids))
            .scalar()
            or 0
        )

    latest_scan = next(
        (
            scan
            for scan in sorted(
                (scan for scan in scoped_scans if scan.status in COMPLETED_STATUSES),
                key=lambda scan: scan.finished_at or scan.created_at,
                reverse=True,
            )
        ),
        None,
    )

    latest_findings: List[Finding] = []
    severity_distribution = SeverityDistribution()
    needs_attention: List[AttentionFinding] = []

    if latest_scan is not None:
        latest_findings = (
            db.query(Finding)
            .filter(Finding.scan_id == latest_scan.id)
            .order_by(Finding.created_at.desc())
            .all()
        )
        for finding in latest_findings:
            if hasattr(severity_distribution, finding.severity):
                setattr(
                    severity_distribution,
                    finding.severity,
                    getattr(severity_distribution, finding.severity) + 1,
                )

        attention_findings = sorted(
            (
                finding
                for finding in latest_findings
                if finding.severity in ("critical", "high", "medium")
                and finding.confidence in ("confirmed", "likely")
            ),
            key=lambda finding: (
                SEVERITY_RANK.get(finding.severity, 9),
                finding.created_at,
            ),
        )[:6]
        needs_attention = [
            AttentionFinding(
                id=finding.id,
                scan_id=latest_scan.id,
                target_url=latest_scan.target_url,
                title=finding.title,
                severity=finding.severity,
                confidence=finding.confidence,
                affected_asset=finding.affected_asset,
                created_at=finding.created_at,
            )
            for finding in attention_findings
        ]

    trend_start = (now - timedelta(days=13)).date()
    trend_days = [trend_start + timedelta(days=offset) for offset in range(14)]
    trend_counts = {
        day.isoformat(): {"total": 0, "completed": 0, "failed": 0} for day in trend_days
    }
    for scan in scoped_scans:
        day_key = scan.created_at.date().isoformat()
        bucket = trend_counts.get(day_key)
        if bucket is None:
            continue
        bucket["total"] += 1
        if scan.status in COMPLETED_STATUSES:
            bucket["completed"] += 1
        elif scan.status == "failed":
            bucket["failed"] += 1
    scan_trend = [
        TrendPoint(
            date=day.isoformat(),
            total=trend_counts[day.isoformat()]["total"],
            completed=trend_counts[day.isoformat()]["completed"],
            failed=trend_counts[day.isoformat()]["failed"],
        )
        for day in trend_days
    ]

    recent_scans_raw = sorted(
        scoped_scans, key=lambda scan: scan.created_at, reverse=True
    )[:8]
    recent_ids = [scan.id for scan in recent_scans_raw]
    recent_finding_counts = {}
    if recent_ids:
        recent_finding_counts = dict(
            db.query(Finding.scan_id, func.count(Finding.id))
            .filter(Finding.scan_id.in_(recent_ids))
            .group_by(Finding.scan_id)
            .all()
        )

    recent_scans = [
        RecentScan(
            id=scan.id,
            target_url=scan.target_url,
            preset=scan.preset,
            status=scan.status,
            budget_seconds_snapshot=scan.budget_seconds_snapshot,
            created_at=scan.created_at,
            finished_at=scan.finished_at,
            finding_count=recent_finding_counts.get(scan.id, 0),
        )
        for scan in recent_scans_raw
    ]

    return DashboardSummary(
        organization_id=organization.id if organization else None,
        organization_name=organization.name if organization else "All organizations",
        active_scans=active_scans,
        completed_scans=completed_scans,
        total_scans=len(scoped_scans),
        approved_assets=asset_query.count(),
        pending_authorizations=authorization_query.filter(
            AuthorizationRequest.status.in_(
                ["submitted", "under_review", "info_requested"]
            )
        ).count(),
        total_findings=total_findings,
        severity_distribution=severity_distribution,
        scan_trend=scan_trend,
        posture=_posture_for(latest_scan, latest_findings),
        needs_attention=needs_attention,
        recent_scans=recent_scans,
        generated_at=now,
    )
