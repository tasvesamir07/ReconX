import uuid
import re
from datetime import timedelta
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.organization import Organization, OrganizationMembership, OrganizationInvitation
from app.models.user import User
from app.models.base import utc_now
from app.core.security import generate_secure_token, hash_token
from app.core.exceptions import ReconXException, PermissionDeniedError, ConflictError
from app.services.email_service import mail_provider

def slugify(text: str) -> str:
    slug = re.sub(r'[^a-zA-Z0-9\-_]+', '-', text.strip().lower())
    return re.sub(r'-+', '-', slug).strip('-')

class OrganizationService:
    @staticmethod
    def create_organization(db: Session, user: User, name: str, slug: Optional[str] = None) -> Organization:
        base_slug = slugify(slug or name)
        final_slug = base_slug
        count = 1
        while db.query(Organization).filter(Organization.slug == final_slug).first():
            final_slug = f"{base_slug}-{count}"
            count += 1

        org = Organization(
            name=name.strip(),
            slug=final_slug,
            status="active",
            created_by=user.id
        )
        db.add(org)
        db.flush()

        membership = OrganizationMembership(
            organization_id=org.id,
            user_id=user.id,
            role="OWNER",
            status="active",
            joined_at=utc_now()
        )
        db.add(membership)
        db.commit()
        db.refresh(org)
        return org

    @staticmethod
    def get_user_organizations(db: Session, user_id: uuid.UUID) -> List[dict]:
        memberships = db.query(OrganizationMembership).filter(
            OrganizationMembership.user_id == user_id,
            OrganizationMembership.status == "active"
        ).all()

        results = []
        for m in memberships:
            results.append({
                "id": m.organization.id,
                "name": m.organization.name,
                "slug": m.organization.slug,
                "status": m.organization.status,
                "created_at": m.organization.created_at,
                "role": m.role
            })
        return results

    @staticmethod
    def get_user_role_in_org(db: Session, user_id: uuid.UUID, org_id: uuid.UUID) -> Optional[str]:
        membership = db.query(OrganizationMembership).filter(
            OrganizationMembership.organization_id == org_id,
            OrganizationMembership.user_id == user_id,
            OrganizationMembership.status == "active"
        ).first()
        return membership.role if membership else None

    @staticmethod
    async def invite_member(
        db: Session,
        inviter: User,
        org_id: uuid.UUID,
        email: str,
        role: str
    ) -> OrganizationInvitation:
        inviter_role = OrganizationService.get_user_role_in_org(db, inviter.id, org_id)
        if inviter_role not in ("OWNER", "ADMIN") and inviter.platform_role != "SUPER_ADMIN":
            raise PermissionDeniedError("Only organization Owners and Admins can invite new members.")

        normalized_email = email.strip().lower()

        # Check existing active membership
        existing_user = db.query(User).filter(User.email == normalized_email).first()
        if existing_user:
            existing_member = db.query(OrganizationMembership).filter(
                OrganizationMembership.organization_id == org_id,
                OrganizationMembership.user_id == existing_user.id,
                OrganizationMembership.status == "active"
            ).first()
            if existing_member:
                raise ConflictError("User is already an active member of this organization.")

        # Revoke previous pending invitations for this email in this org
        db.query(OrganizationInvitation).filter(
            OrganizationInvitation.organization_id == org_id,
            OrganizationInvitation.email == normalized_email,
            OrganizationInvitation.accepted_at.is_(None),
            OrganizationInvitation.revoked_at.is_(None)
        ).update({"revoked_at": utc_now()})

        raw_token = generate_secure_token(32)
        token_hash = hash_token(raw_token)
        expires_at = utc_now() + timedelta(days=7)

        invitation = OrganizationInvitation(
            organization_id=org_id,
            email=normalized_email,
            role=role,
            token_hash=token_hash,
            expires_at=expires_at,
            invited_by=inviter.id
        )
        db.add(invitation)
        db.commit()
        db.refresh(invitation)

        org = db.query(Organization).filter(Organization.id == org_id).first()
        # Dispatch email
        subject = f"Invitation to join {org.name} on ReconX"
        text = (
            f"Hello,\n\n"
            f"You have been invited by {inviter.display_name} to join {org.name} as a {role}.\n\n"
            f"Accept your invitation with the token:\n{raw_token}\n\n"
            f"This invitation will expire in 7 days.\n\n"
            f"— The ReconX Security Team"
        )
        await mail_provider.send_mail(normalized_email, subject, text)
        return invitation

    @staticmethod
    def accept_invitation(db: Session, user: User, raw_token: str) -> OrganizationMembership:
        token_hash = hash_token(raw_token.strip())
        now = utc_now()

        invitation = db.query(OrganizationInvitation).filter(
            OrganizationInvitation.token_hash == token_hash,
            OrganizationInvitation.accepted_at.is_(None),
            OrganizationInvitation.revoked_at.is_(None)
        ).first()

        if not invitation:
            raise ReconXException(400, "INVALID_INVITATION", "Invalid or expired organization invitation.")

        if invitation.expires_at < now:
            invitation.revoked_at = now
            db.commit()
            raise ReconXException(400, "INVITATION_EXPIRED", "This organization invitation has expired.")

        # Verified email must match invitation email
        if user.email.lower() != invitation.email.lower():
            raise PermissionDeniedError(
                f"This invitation was sent to {invitation.email}. Your account email is {user.email}."
            )

        # Check existing membership
        existing_membership = db.query(OrganizationMembership).filter(
            OrganizationMembership.organization_id == invitation.organization_id,
            OrganizationMembership.user_id == user.id
        ).first()

        if existing_membership:
            existing_membership.role = invitation.role
            existing_membership.status = "active"
            membership = existing_membership
        else:
            membership = OrganizationMembership(
                organization_id=invitation.organization_id,
                user_id=user.id,
                role=invitation.role,
                status="active",
                joined_at=now
            )
            db.add(membership)

        invitation.accepted_at = now
        db.commit()
        db.refresh(membership)
        return membership
