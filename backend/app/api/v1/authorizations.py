import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy import or_
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from app.database import get_db
from app.core.security import verify_password
from app.models.user import User
from app.models.organization import OrganizationMembership
from app.models.authorization import AuthorizationRequest, ApprovedAsset
from app.models.scan import Scan, ScanEvent
from app.schemas.authorization import AuthRequestCreate, AuthRequestResponse, ApprovedAssetResponse, ScopeActionRequest
from app.services.audit_service import AuditService
from app.services.org_service import OrganizationService
from app.services.scan_executor import _log_event
from app.api.deps import get_current_user
from app.core.exceptions import NotFoundError, PermissionDeniedError, PolicyViolationError
from app.models.base import utc_now

router = APIRouter(tags=["Authorizations & Assets"])

PLATFORM_OVERSIGHT = ("SUPER_ADMIN", "MODERATOR")


@router.post("/authorizations", response_model=AuthRequestResponse, status_code=status.HTTP_201_CREATED)
def submit_authorization_request(
    data: AuthRequestCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if data.organization_id is not None:
        role = OrganizationService.get_user_role_in_org(db, user.id, data.organization_id)
        if role is None:
            raise PermissionDeniedError("You are not a member of this organization.")
        if role == "VIEWER":
            raise PermissionDeniedError("Viewers cannot submit authorization requests.")

    # Simulated advisory AI extraction check on submission
    ai_flags = []
    for domain in data.requested_domains:
        if "test" in domain.lower() or "localhost" in domain.lower():
            ai_flags.append({"type": "warning", "message": f"Domain '{domain}' appears to be a test/local environment."})

    req = AuthorizationRequest(
        organization_id=data.organization_id,
        requested_by=user.id,
        company_name=data.company_name.strip(),
        employee_name=data.employee_name.strip(),
        contact_email=data.contact_email.strip().lower(),
        status="under_review",
        requested_scope={
            "domains": [d.strip().lower() for d in data.requested_domains],
            "allow_subdomains": data.allow_subdomains,
            "categories": ["dns", "tls", "http", "headers", "input_validation"]
        },
        requested_start_at=data.requested_start_at,
        requested_expiry_at=data.requested_expiry_at,
        ai_extraction_status="completed",
        ai_extracted_fields={
            "extracted_company": data.company_name,
            "extracted_employee": data.employee_name,
            "domains_found": data.requested_domains
        },
        ai_flags=ai_flags
    )
    db.add(req)
    db.commit()
    db.refresh(req)

    AuditService.log(
        db, "auth_request.submitted", "authorization_request", str(req.id),
        actor_id=user.id, organization_id=data.organization_id
    )
    return req

@router.get("/authorizations", response_model=List[AuthRequestResponse])
def list_authorizations(
    organization_id: Optional[UUID] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(AuthorizationRequest)

    if organization_id is not None:
        # IDOR guard: requesting another tenant's workspace requires membership.
        if user.platform_role not in PLATFORM_OVERSIGHT:
            role = OrganizationService.get_user_role_in_org(db, user.id, organization_id)
            if role is None:
                raise PermissionDeniedError("You are not a member of this organization.")
        query = query.filter(AuthorizationRequest.organization_id == organization_id)
    elif user.platform_role not in PLATFORM_OVERSIGHT:
        # Default view: the caller's own submissions plus their workspaces.
        member_org_ids = [
            membership.organization_id
            for membership in db.query(OrganizationMembership).filter(
                OrganizationMembership.user_id == user.id,
                OrganizationMembership.status == "active",
            ).all()
        ]
        query = query.filter(
            or_(
                AuthorizationRequest.requested_by == user.id,
                AuthorizationRequest.organization_id.in_(member_org_ids),
            )
        )

    return query.order_by(AuthorizationRequest.created_at.desc()).all()

def check_can_manage_governance(
    user: User,
    organization_id: Optional[UUID],
    db: Session,
    password: Optional[str] = None
) -> None:
    """
    Strict Dual-Control Governance & Identity Re-Authentication:
    1. Analysts and Viewers are strictly prohibited from revoking or deleting corporate scopes.
    2. Only Platform Super Admin, Compliance Moderator, or Organization Owner/Admin are authorized.
    3. Re-authentication with the operator's account password is required for all revocation/deletion actions.
    """
    # 1. Role Verification (Strict Analyst Block)
    is_moderator_or_admin = user.platform_role in ("SUPER_ADMIN", "MODERATOR")
    is_org_leader = False
    if organization_id is not None:
        role = OrganizationService.get_user_role_in_org(db, user.id, organization_id)
        if role in ("OWNER", "ADMIN"):
            is_org_leader = True

    if not (is_moderator_or_admin or is_org_leader):
        raise PermissionDeniedError(
            "Access Denied: Security Analysts cannot revoke or delete corporate authorization scopes. "
            "This action requires Compliance Moderator or Organization Admin privileges."
        )

    # 2. Operator Identity Re-authentication (Password check)
    if not password:
        raise PolicyViolationError(
            "PASSWORD_REQUIRED",
            "Operator password re-authentication is required to confirm scope revocation or deletion."
        )

    # Re-authentication must verify the operator's real password. There is no
    # master/backdoor password: a shared secret would let anyone holding the
    # demo credential revoke or delete production scopes.
    valid = bool(user.password_hash) and verify_password(password, user.password_hash)
    if not valid:
        raise PolicyViolationError(
            "INVALID_CREDENTIALS",
            "Authentication failed: Incorrect operator password provided. Scope action blocked."
        )

@router.get("/authorizations/{auth_id}", response_model=AuthRequestResponse)
def get_authorization(auth_id: UUID, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    req = db.query(AuthorizationRequest).filter(AuthorizationRequest.id == auth_id).first()
    if not req:
        raise NotFoundError("Authorization request not found.")
    if req.requested_by == user.id or user.platform_role in PLATFORM_OVERSIGHT:
        return req
    if req.organization_id is not None:
        role = OrganizationService.get_user_role_in_org(db, user.id, req.organization_id)
        if role is not None:
            return req
    raise PermissionDeniedError("Access denied.")

@router.post("/authorizations/{auth_id}/revoke", response_model=AuthRequestResponse)
def revoke_authorization(
    auth_id: UUID,
    data: ScopeActionRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Revokes an authorized scope immediately. Requires operator re-authentication and Moderator/Admin privileges.
    """
    req = db.query(AuthorizationRequest).filter(AuthorizationRequest.id == auth_id).first()
    if not req:
        raise NotFoundError("Authorization request not found.")

    check_can_manage_governance(user, req.organization_id, db, data.password)

    now = utc_now()
    req.status = "revoked"

    # Revoke all approved assets
    assets = db.query(ApprovedAsset).filter(ApprovedAsset.authorization_request_id == req.id).all()
    for asset in assets:
        asset.status = "revoked"
        asset.revoked_at = now

        # Cancel any active scans on this asset
        active_scans = db.query(Scan).filter(
            Scan.approved_asset_id == asset.id,
            Scan.status.in_(["queued", "validating", "provisioning", "running", "stopping"])
        ).all()
        for sc in active_scans:
            sc.status = "cancelled"
            sc.cancelled_at = now
            _log_event(db, sc.id, "lifecycle", "warning", f"Scan cancelled: Scope authorization was revoked by {user.display_name or user.email}.")

    db.commit()
    db.refresh(req)

    AuditService.log(
        db, "auth_request.revoked", "authorization_request", str(req.id),
        actor_id=user.id, organization_id=req.organization_id,
        metadata_json={"revoked_by": user.email, "company": req.company_name, "reason": data.reason}
    )
    return req

@router.post("/authorizations/{auth_id}/delete", status_code=status.HTTP_200_OK)
@router.delete("/authorizations/{auth_id}", status_code=status.HTTP_200_OK)
def delete_authorization(
    auth_id: UUID,
    data: ScopeActionRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Permanently deletes an authorization request and its associated approved assets and scans.
    Requires operator re-authentication and Moderator/Admin privileges.
    """
    req = db.query(AuthorizationRequest).filter(AuthorizationRequest.id == auth_id).first()
    if not req:
        raise NotFoundError("Authorization request not found.")

    check_can_manage_governance(user, req.organization_id, db, data.password)

    org_id = req.organization_id
    company = req.company_name

    assets = db.query(ApprovedAsset).filter(ApprovedAsset.authorization_request_id == req.id).all()
    asset_ids = [a.id for a in assets]

    # Delete any scans referencing these assets first to satisfy foreign key constraints
    if asset_ids:
        scans = db.query(Scan).filter(Scan.approved_asset_id.in_(asset_ids)).all()
        for sc in scans:
            db.delete(sc)
        db.flush()

    for asset in assets:
        db.delete(asset)
    db.flush()

    db.delete(req)
    db.commit()

    AuditService.log(
        db, "auth_request.deleted", "authorization_request", str(auth_id),
        actor_id=user.id, organization_id=org_id,
        metadata_json={"deleted_by": user.email, "company": company, "reason": data.reason}
    )

    return {
        "status": "success",
        "message": f"Authorization request for '{company}' and associated scopes have been removed.",
        "id": str(auth_id)
    }

@router.get("/assets", response_model=List[ApprovedAssetResponse])
def list_approved_assets(
    organization_id: Optional[UUID] = None,
    include_inactive: bool = False,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(ApprovedAsset)
    if not include_inactive:
        query = query.filter(ApprovedAsset.status == "active", ApprovedAsset.expires_at > utc_now())

    if organization_id is not None:
        # IDOR guard: never expose another tenant's approved targets by ID.
        if user.platform_role not in PLATFORM_OVERSIGHT:
            role = OrganizationService.get_user_role_in_org(db, user.id, organization_id)
            if role is None:
                raise PermissionDeniedError("You are not a member of this organization.")
        query = query.filter(ApprovedAsset.organization_id == organization_id)
    elif user.platform_role not in PLATFORM_OVERSIGHT:
        # Scope to workspaces the caller belongs to, plus assets requested by
        # the caller in a personal (organization-less) workflow.
        member_org_ids = [
            membership.organization_id
            for membership in db.query(OrganizationMembership).filter(
                OrganizationMembership.user_id == user.id,
                OrganizationMembership.status == "active",
            ).all()
        ]
        query = query.join(
            AuthorizationRequest,
            ApprovedAsset.authorization_request_id == AuthorizationRequest.id,
        ).filter(
            or_(
                ApprovedAsset.organization_id.in_(member_org_ids),
                AuthorizationRequest.requested_by == user.id,
            )
        )

    return query.order_by(ApprovedAsset.created_at.desc()).all()

@router.post("/assets/{asset_id}/revoke", response_model=ApprovedAssetResponse)
def revoke_asset(
    asset_id: UUID,
    data: ScopeActionRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Revokes an individual target asset scope. Requires operator re-authentication and Moderator/Admin privileges.
    """
    asset = db.query(ApprovedAsset).filter(ApprovedAsset.id == asset_id).first()
    if not asset:
        raise NotFoundError("Asset not found.")

    check_can_manage_governance(user, asset.organization_id, db, data.password)

    now = utc_now()
    asset.status = "revoked"
    asset.revoked_at = now

    active_scans = db.query(Scan).filter(
        Scan.approved_asset_id == asset.id,
        Scan.status.in_(["queued", "validating", "provisioning", "running", "stopping"])
    ).all()
    for sc in active_scans:
        sc.status = "cancelled"
        sc.cancelled_at = now
        _log_event(db, sc.id, "lifecycle", "warning", f"Scan cancelled: Target asset authorization revoked by {user.display_name or user.email}.")

    db.commit()
    db.refresh(asset)

    AuditService.log(
        db, "asset.revoked", "approved_asset", str(asset.id),
        actor_id=user.id, organization_id=asset.organization_id,
        metadata_json={"host": asset.canonical_host, "revoked_by": user.email, "reason": data.reason}
    )
    return asset

@router.post("/assets/{asset_id}/delete", status_code=status.HTTP_200_OK)
@router.delete("/assets/{asset_id}", status_code=status.HTTP_200_OK)
def delete_asset(
    asset_id: UUID,
    data: ScopeActionRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Permanently removes an individual approved asset and its scans. Requires operator re-authentication.
    """
    asset = db.query(ApprovedAsset).filter(ApprovedAsset.id == asset_id).first()
    if not asset:
        raise NotFoundError("Asset not found.")

    check_can_manage_governance(user, asset.organization_id, db, data.password)

    host = asset.canonical_host
    org_id = asset.organization_id

    scans = db.query(Scan).filter(Scan.approved_asset_id == asset.id).all()
    for sc in scans:
        db.delete(sc)
    db.flush()

    db.delete(asset)
    db.commit()

    AuditService.log(
        db, "asset.deleted", "approved_asset", str(asset_id),
        actor_id=user.id, organization_id=org_id,
        metadata_json={"host": host, "deleted_by": user.email, "reason": data.reason}
    )

    return {
        "status": "success",
        "message": f"Approved asset '{host}' removed.",
        "id": str(asset_id)
    }
