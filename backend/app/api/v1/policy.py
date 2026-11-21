import socket
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.exceptions import PolicyViolationError
from app.database import get_db
from app.models.authorization import ApprovedAsset
from app.models.base import utc_now
from app.models.organization import OrganizationMembership
from app.models.user import User
from app.schemas.dashboard import (
    PolicyCheck,
    PolicySimulationRequest,
    PolicySimulationResponse,
)
from app.services.policy_engine import (
    canonicalize_host,
    is_ip_prohibited,
)

router = APIRouter(prefix="/policy", tags=["Policy Engine"])


def _matches_scope(host: str, asset: ApprovedAsset) -> bool:
    approved_host = asset.canonical_host.lower()
    if asset.scope_type == "wildcard_subdomains":
        return host == approved_host or host.endswith("." + approved_host)
    return host == approved_host


@router.post("/simulate", response_model=PolicySimulationResponse)
def simulate_policy(
    data: PolicySimulationRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    checks: List[PolicyCheck] = []
    now = utc_now()

    canonical_host: Optional[str] = None
    resolved_ip: Optional[str] = None
    matched_asset: Optional[ApprovedAsset] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None

    # 1. URL parsing and canonicalization
    try:
        canonical_host = canonicalize_host(data.target_url)
        checks.append(
            PolicyCheck(
                id="url_syntax",
                label="Target URL syntax",
                status="pass",
                detail=f"Parsed target host as '{canonical_host}'.",
            )
        )
    except PolicyViolationError as exc:
        message = exc.detail.get("message", str(exc.detail)) if isinstance(exc.detail, dict) else str(exc.detail)
        checks.append(
            PolicyCheck(
                id="url_syntax",
                label="Target URL syntax",
                status="fail",
                detail=message,
            )
        )
        return PolicySimulationResponse(
            allowed=False,
            target_url=data.target_url,
            checks=checks,
            error_code="INVALID_TARGET_URL",
            error_message=message,
        )

    # 2. Resolve the candidate assets the caller is allowed to see.
    asset_query = db.query(ApprovedAsset)
    if data.organization_id is not None:
        membership = (
            db.query(OrganizationMembership)
            .filter(
                OrganizationMembership.organization_id == data.organization_id,
                OrganizationMembership.user_id == user.id,
                OrganizationMembership.status == "active",
            )
            .first()
        )
        if membership is None and user.platform_role not in ("SUPER_ADMIN", "MODERATOR"):
            checks.append(
                PolicyCheck(
                    id="organization_access",
                    label="Organization access",
                    status="fail",
                    detail="You are not an active member of this organization.",
                )
            )
            return PolicySimulationResponse(
                allowed=False,
                target_url=data.target_url,
                canonical_host=canonical_host,
                checks=checks,
                error_code="PERMISSION_DENIED",
                error_message="You are not an active member of this organization.",
            )
        asset_query = asset_query.filter(
            ApprovedAsset.organization_id == data.organization_id
        )
    elif user.platform_role not in ("SUPER_ADMIN", "MODERATOR"):
        member_org_ids = [
            membership.organization_id
            for membership in db.query(OrganizationMembership)
            .filter(
                OrganizationMembership.user_id == user.id,
                OrganizationMembership.status == "active",
            )
            .all()
        ]
        asset_query = asset_query.filter(
            ApprovedAsset.organization_id.in_(member_org_ids)
        )

    candidates = [
        asset for asset in asset_query.all() if _matches_scope(canonical_host, asset)
    ]

    if not candidates:
        checks.append(
            PolicyCheck(
                id="approved_scope",
                label="Approved scope",
                status="fail",
                detail=f"'{canonical_host}' is not covered by any approved asset for this workspace.",
            )
        )
        checks.append(
            PolicyCheck(
                id="asset_status",
                label="Asset validity window",
                status="skip",
                detail="Not evaluated because no approved asset matches the target.",
            )
        )
        checks.append(
            PolicyCheck(
                id="authorization",
                label="Authorization record",
                status="skip",
                detail="Not evaluated because no approved asset matches the target.",
            )
        )
        checks.append(
            PolicyCheck(
                id="dns",
                label="DNS resolution",
                status="skip",
                detail="Not evaluated because the target is outside approved scope.",
            )
        )
        checks.append(
            PolicyCheck(
                id="ssrf",
                label="SSRF destination guard",
                status="skip",
                detail="Not evaluated because the target is outside approved scope.",
            )
        )
        return PolicySimulationResponse(
            allowed=False,
            target_url=data.target_url,
            canonical_host=canonical_host,
            checks=checks,
            error_code="TARGET_OUTSIDE_APPROVED_SCOPE",
            error_message=f"Target host '{canonical_host}' is outside the approved scope.",
        )

    # Prefer an asset that is currently inside its validity window.
    active_candidates = [
        asset
        for asset in candidates
        if asset.status == "active"
        and asset.valid_from <= now <= asset.expires_at
    ]
    matched_asset = active_candidates[0] if active_candidates else candidates[0]

    checks.append(
        PolicyCheck(
            id="approved_scope",
            label="Approved scope",
            status="pass",
            detail=(
                f"Matched approved asset '{matched_asset.canonical_host}' "
                f"({matched_asset.scope_type.replace('_', ' ')})."
            ),
        )
    )

    # 3. Asset validity window
    if matched_asset.status != "active":
        checks.append(
            PolicyCheck(
                id="asset_status",
                label="Asset validity window",
                status="fail",
                detail=f"Asset status is '{matched_asset.status}', not active.",
            )
        )
        error_code = "AUTHORIZATION_EXPIRED"
        error_message = "The authorization for this asset is not currently active."
    elif matched_asset.valid_from > now:
        checks.append(
            PolicyCheck(
                id="asset_status",
                label="Asset validity window",
                status="fail",
                detail=f"Authorization becomes valid on {matched_asset.valid_from.isoformat()}.",
            )
        )
        error_code = "AUTHORIZATION_NOT_YET_VALID"
        error_message = "The authorization window has not started yet."
    elif matched_asset.expires_at < now:
        checks.append(
            PolicyCheck(
                id="asset_status",
                label="Asset validity window",
                status="fail",
                detail=f"Authorization expired on {matched_asset.expires_at.isoformat()}.",
            )
        )
        error_code = "AUTHORIZATION_EXPIRED"
        error_message = "The authorization for this asset has expired."
    else:
        checks.append(
            PolicyCheck(
                id="asset_status",
                label="Asset validity window",
                status="pass",
                detail=f"Authorization is active until {matched_asset.expires_at.isoformat()}.",
            )
        )

    # 4. Authorization record state
    authorization = matched_asset.authorization_request
    if authorization is None:
        checks.append(
            PolicyCheck(
                id="authorization",
                label="Authorization record",
                status="fail",
                detail="Approved asset is not linked to an authorization request.",
            )
        )
        error_code = error_code or "AUTHORIZATION_RECORD_MISSING"
        error_message = error_message or "The asset is missing its authorization record."
    elif authorization.status != "approved":
        checks.append(
            PolicyCheck(
                id="authorization",
                label="Authorization record",
                status="fail",
                detail=f"Authorization request status is '{authorization.status}', not approved.",
            )
        )
        error_code = error_code or "AUTHORIZATION_NOT_APPROVED"
        error_message = error_message or "The underlying authorization is not approved."
    else:
        checks.append(
            PolicyCheck(
                id="authorization",
                label="Authorization record",
                status="pass",
                detail=f"Authorization request {authorization.id} is approved.",
            )
        )

    # 5. DNS resolution
    dns_ok = False
    if matched_asset.status == "active" and matched_asset.expires_at >= now:
        try:
            addr_info = socket.getaddrinfo(
                canonical_host, None, socket.AF_UNSPEC, socket.SOCK_STREAM
            )
            if not addr_info:
                raise socket.gaierror("No address records returned.")
            resolved_ip = addr_info[0][4][0]
            dns_ok = True
            checks.append(
                PolicyCheck(
                    id="dns",
                    label="DNS resolution",
                    status="pass",
                    detail=f"Resolved '{canonical_host}' to {resolved_ip}.",
                )
            )
        except socket.gaierror as exc:
            checks.append(
                PolicyCheck(
                    id="dns",
                    label="DNS resolution",
                    status="fail",
                    detail=f"DNS lookup failed: {exc}.",
                )
            )
            error_code = error_code or "DNS_RESOLUTION_FAILED"
            error_message = error_message or f"DNS lookup failed for {canonical_host}."
    else:
        checks.append(
            PolicyCheck(
                id="dns",
                label="DNS resolution",
                status="skip",
                detail="Not evaluated because the authorization is not active.",
            )
        )

    # 6. SSRF destination guard
    if dns_ok and resolved_ip:
        prohibited = is_ip_prohibited(resolved_ip)
        checks.append(
            PolicyCheck(
                id="ssrf",
                label="SSRF destination guard",
                status="fail" if prohibited else "pass",
                detail=(
                    f"Resolved address {resolved_ip} is private, loopback, link-local, "
                    "or otherwise prohibited."
                    if prohibited
                    else f"Resolved address {resolved_ip} is a public, routable address."
                ),
            )
        )
        if prohibited:
            error_code = error_code or "SSRF_PROHIBITED_DESTINATION"
            error_message = (
                error_message
                or "Target resolves to a prohibited or private address. Scanning is blocked."
            )
    else:
        checks.append(
            PolicyCheck(
                id="ssrf",
                label="SSRF destination guard",
                status="skip",
                detail="Not evaluated because DNS resolution did not succeed.",
            )
        )

    # 7. Permitted capability categories
    permitted_categories = matched_asset.permitted_categories or []
    if permitted_categories:
        checks.append(
            PolicyCheck(
                id="categories",
                label="Permitted check categories",
                status="pass",
                detail=", ".join(permitted_categories),
            )
        )
    else:
        checks.append(
            PolicyCheck(
                id="categories",
                label="Permitted check categories",
                status="warn",
                detail="No capability categories are permitted for this asset.",
            )
        )
        error_code = error_code or "CAPABILITY_NOT_PERMITTED"
        error_message = error_message or "No check categories are permitted for this asset."

    allowed = not any(check.status in ("fail", "warn") for check in checks)

    return PolicySimulationResponse(
        allowed=allowed,
        target_url=data.target_url,
        canonical_host=canonical_host,
        resolved_ip=resolved_ip,
        matched_asset_id=matched_asset.id,
        authorization_id=matched_asset.authorization_request_id,
        organization_id=matched_asset.organization_id,
        scope_type=matched_asset.scope_type,
        expires_at=matched_asset.expires_at,
        checks=checks,
        error_code=None if allowed else error_code,
        error_message=None if allowed else error_message,
    )
