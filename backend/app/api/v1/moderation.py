from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.database import get_db
from app.models.user import User
from app.models.authorization import AuthorizationRequest, ApprovedAsset
from app.schemas.authorization import AuthRequestResponse, ModeratorDecisionRequest
from app.services.audit_service import AuditService
from app.api.deps import require_platform_role
from app.core.exceptions import NotFoundError, PolicyViolationError
from app.models.base import utc_now

router = APIRouter(prefix="/moderation", tags=["Moderation"])

@router.get("/authorizations", response_model=List[AuthRequestResponse])
def list_pending_authorizations(
    moderator: User = Depends(require_platform_role("MODERATOR", "SUPER_ADMIN")),
    db: Session = Depends(get_db)
):
    return db.query(AuthorizationRequest).filter(
        AuthorizationRequest.status.in_(["submitted", "under_review", "info_requested"])
    ).order_by(AuthorizationRequest.created_at.asc()).all()

@router.post("/authorizations/{auth_id}/decision", response_model=AuthRequestResponse)
def make_moderator_decision(
    auth_id: UUID,
    data: ModeratorDecisionRequest,
    moderator: User = Depends(require_platform_role("MODERATOR", "SUPER_ADMIN")),
    db: Session = Depends(get_db)
):
    req = db.query(AuthorizationRequest).filter(AuthorizationRequest.id == auth_id).first()
    if not req:
        raise NotFoundError("Authorization request not found.")

    # Separation of duties: Moderator cannot approve their own submission
    if req.requested_by == moderator.id:
        raise PolicyViolationError("CONFLICT_OF_INTEREST", "Moderator cannot review or approve their own authorization request.")

    # Get original requested subdomain scope
    req_subdomains = bool(req.requested_scope.get("allow_subdomains", False))
    
    # Determine final subdomain setting
    subdomains_allowed = data.allow_subdomains if data.allow_subdomains is not None else req_subdomains
    
    # Validate subdomain scope change confirmation
    if subdomains_allowed != req_subdomains:
        if not data.subdomain_scope_confirmed:
            raise PolicyViolationError(
                "SUBDOMAIN_SCOPE_CONFIRMATION_REQUIRED",
                f"Subdomain scope change detected: original request had allow_subdomains={req_subdomains}, "
                f"but moderator decision sets allow_subdomains={subdomains_allowed}. "
                f"Explicit confirmation via subdomain_scope_confirmed=true is required."
            )

    now = utc_now()
    req.status = data.decision
    req.moderator_id = moderator.id
    req.moderator_decision_at = now
    req.moderator_reason = data.reason

    if data.decision == "approved":
        approved_domains = data.approved_domains or req.requested_scope.get("domains", [])
        expiry = data.approved_expiry_at or req.requested_expiry_at

        # Create approved assets for each domain
        for domain in approved_domains:
            asset = ApprovedAsset(
                organization_id=req.organization_id,
                authorization_request_id=req.id,
                canonical_host=domain.strip().lower(),
                scope_type="wildcard_subdomains" if subdomains_allowed else "exact_host",
                permitted_categories=data.permitted_categories or ["dns", "tls", "http", "headers"],
                valid_from=now,
                expires_at=expiry,
                status="active"
            )
            db.add(asset)

    db.commit()
    db.refresh(req)

    AuditService.log(
        db, f"auth_request.{data.decision}", "authorization_request", str(req.id),
        actor_id=moderator.id, organization_id=req.organization_id,
        decision=data.decision, reason=data.reason,
        metadata_json={
            "subdomain_scope_changed": subdomains_allowed != req_subdomains,
            "original_allow_subdomains": req_subdomains,
            "approved_allow_subdomains": subdomains_allowed,
        }
    )
    return req
