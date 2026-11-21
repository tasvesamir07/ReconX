from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.database import get_db
from app.models.user import User
from app.models.organization import Organization, OrganizationMembership, OrganizationInvitation
from app.schemas.organization import (
    OrgCreate,
    OrgUpdate,
    OrgResponse,
    MemberResponse,
    InviteRequest,
    InvitationResponse,
    AcceptInvitationRequest
)
from app.services.org_service import OrganizationService
from app.services.audit_service import AuditService
from app.api.deps import get_current_user, require_org_membership
from app.core.exceptions import NotFoundError, PermissionDeniedError

router = APIRouter(prefix="/organizations", tags=["Organizations"])

@router.post("", response_model=OrgResponse, status_code=status.HTTP_201_CREATED)
def create_organization(data: OrgCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    org = OrganizationService.create_organization(db, user, data.name, data.slug)
    AuditService.log(db, "organization.created", "organization", str(org.id), actor_id=user.id, organization_id=org.id)
    return {
        "id": org.id,
        "name": org.name,
        "slug": org.slug,
        "status": org.status,
        "created_at": org.created_at,
        "role": "OWNER"
    }

@router.get("", response_model=List[OrgResponse])
def list_user_organizations(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return OrganizationService.get_user_organizations(db, user.id)

@router.get("/{org_id}", response_model=OrgResponse)
def get_organization(org_id: UUID, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    role = require_org_membership(org_id, user, db)
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise NotFoundError("Organization not found.")
    return {
        "id": org.id,
        "name": org.name,
        "slug": org.slug,
        "status": org.status,
        "created_at": org.created_at,
        "role": role
    }

@router.get("/{org_id}/members", response_model=List[MemberResponse])
def list_org_members(org_id: UUID, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_org_membership(org_id, user, db)
    memberships = db.query(OrganizationMembership).filter(
        OrganizationMembership.organization_id == org_id,
        OrganizationMembership.status == "active"
    ).all()
    results = []
    for m in memberships:
        # Platform Super Admin is never an organization member
        if m.user.platform_role == "SUPER_ADMIN" or m.user.email == "admin@reconx.local":
            continue
        results.append({
            "id": m.id,
            "user_id": m.user.id,
            "email": m.user.email,
            "display_name": m.user.display_name,
            "role": m.role,
            "status": m.status,
            "joined_at": m.joined_at
        })
    return results

@router.post("/{org_id}/invitations", response_model=InvitationResponse, status_code=status.HTTP_201_CREATED)
async def invite_member(
    org_id: UUID,
    data: InviteRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    invitation = await OrganizationService.invite_member(db, user, org_id, data.email, data.role)
    AuditService.log(
        db, "organization.invitation_sent", "invitation", str(invitation.id),
        actor_id=user.id, organization_id=org_id, metadata_json={"email": data.email, "role": data.role}
    )
    return invitation

@router.post("/invitations/accept", response_model=MemberResponse)
def accept_invitation(
    data: AcceptInvitationRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    membership = OrganizationService.accept_invitation(db, user, data.token)
    AuditService.log(
        db, "organization.invitation_accepted", "membership", str(membership.id),
        actor_id=user.id, organization_id=membership.organization_id
    )
    return {
        "id": membership.id,
        "user_id": user.id,
        "email": user.email,
        "display_name": user.display_name,
        "role": membership.role,
        "status": membership.status,
        "joined_at": membership.joined_at
    }

@router.delete("/{org_id}/members/{user_id}")
def remove_org_member(
    org_id: UUID,
    user_id: UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    actor_role = OrganizationService.get_user_role_in_org(db, user.id, org_id)
    if actor_role not in ("OWNER", "ADMIN") and user.platform_role != "SUPER_ADMIN":
        raise PermissionDeniedError("Only organization Owners and Admins can remove members.")

    membership = db.query(OrganizationMembership).filter(
        OrganizationMembership.organization_id == org_id,
        OrganizationMembership.user_id == user_id,
        OrganizationMembership.status == "active"
    ).first()

    if not membership:
        raise NotFoundError("Active membership record not found for this user in organization.")

    # Guard: prevent removing the last owner
    if membership.role == "OWNER":
        owner_count = db.query(OrganizationMembership).filter(
            OrganizationMembership.organization_id == org_id,
            OrganizationMembership.role == "OWNER",
            OrganizationMembership.status == "active"
        ).count()
        if owner_count <= 1:
            from app.core.exceptions import PolicyViolationError
            raise PolicyViolationError("LAST_OWNER", "Cannot remove the only Owner of an organization.")

    membership.status = "revoked"
    db.commit()
    AuditService.log(
        db, "organization.member_removed", "membership", str(membership.id),
        actor_id=user.id, organization_id=org_id, metadata_json={"removed_user_id": str(user_id)}
    )
    return {"status": "success", "message": "Member access successfully revoked."}

