import logging
from datetime import timedelta
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.user import User
from app.models.organization import Organization, OrganizationMembership
from app.models.authorization import AuthorizationRequest, ApprovedAsset
from app.models.base import utc_now
from app.core.security import hash_password
from app.config import settings

logger = logging.getLogger("reconx.seed")

DEMO_PASSWORD = settings.DEMO_ACCOUNT_PASSWORD

DEMO_ACCOUNTS = [
    {
        "email": "admin@reconx.local",
        "display_name": "Platform Super Admin",
        "platform_role": "SUPER_ADMIN",
        "org_role": None  # Super Admin does not belong to any tenant
    },
    {
        "email": "moderator@reconx.local",
        "display_name": "Organization Moderator",
        "platform_role": "MODERATOR",
        "org_role": "OWNER"
    },
    {
        "email": "analyst@reconx.local",
        "display_name": "Lead Security Analyst",
        "platform_role": "USER",
        "org_role": "ANALYST"
    }
]

def seed_demo_data():
    """Seeds default demo accounts, organization, and approved assets for instant demonstration."""
    db: Session = SessionLocal()
    try:
        now = utc_now()
        hashed_pwd = hash_password(DEMO_PASSWORD)

        # 1. Create or update Demo Users
        users_map = {}
        for acc in DEMO_ACCOUNTS:
            user = db.query(User).filter(User.email == acc["email"]).first()
            if not user:
                user = User(
                    email=acc["email"],
                    display_name=acc["display_name"],
                    password_hash=hashed_pwd,
                    status="active",
                    platform_role=acc["platform_role"],
                    email_verified_at=now
                )
                db.add(user)
                db.flush()
                logger.info(f"Seeded user: {acc['email']} ({acc['platform_role']})")
            else:
                # Never overwrite an existing password or role: a local demo
                # account that an operator has changed must stay changed.
                if not user.email_verified_at:
                    user.email_verified_at = now
                db.flush()
            users_map[acc["email"]] = user

        # 2. Create Demo Organization owned by the Organization Moderator
        moderator_user = users_map["moderator@reconx.local"]
        org = db.query(Organization).filter(Organization.slug == "acme-defense").first()
        if not org:
            org = Organization(
                name="Acme Cyber Defense Corp",
                slug="acme-defense",
                status="active",
                created_by=moderator_user.id
            )
            db.add(org)
            db.flush()
            logger.info("Seeded organization: Acme Cyber Defense Corp (acme-defense)")

        # 3. Create Organization Memberships (Super Admin is NEVER added to any org)
        for acc in DEMO_ACCOUNTS:
            if not acc["org_role"]:
                continue
            u = users_map[acc["email"]]
            membership = db.query(OrganizationMembership).filter(
                OrganizationMembership.organization_id == org.id,
                OrganizationMembership.user_id == u.id
            ).first()
            if not membership:
                membership = OrganizationMembership(
                    organization_id=org.id,
                    user_id=u.id,
                    role=acc["org_role"],
                    status="active",
                    joined_at=now
                )
                db.add(membership)
            else:
                membership.role = acc["org_role"]
                membership.status = "active"


        # 4. Create Demo Authorization Request & Approved Asset
        authz_req = db.query(AuthorizationRequest).filter(
            AuthorizationRequest.organization_id == org.id,
            AuthorizationRequest.company_name == "Acme Corporation"
        ).first()

        if not authz_req:
            authz_req = AuthorizationRequest(
                organization_id=org.id,
                requested_by=users_map["analyst@reconx.local"].id,
                company_name="Acme Corporation",
                employee_name="Lead Security Analyst",
                contact_email="analyst@reconx.local",
                status="approved",
                requested_scope={
                    "domains": ["example.com"],
                    "allow_subdomains": False,
                    "categories": ["dns", "tls", "http", "headers", "cookies", "server_leak"]
                },
                requested_start_at=now - timedelta(days=5),
                requested_expiry_at=now + timedelta(days=90),
                ai_extraction_status="completed",
                ai_extracted_fields={"company": "Acme Corporation", "domains": ["example.com"]},
                moderator_id=users_map["moderator@reconx.local"].id,
                moderator_decision_at=now - timedelta(days=5),
                moderator_reason="Official corporate authorization letter verified."
            )
            db.add(authz_req)
            db.flush()

        asset = db.query(ApprovedAsset).filter(
            ApprovedAsset.organization_id == org.id,
            ApprovedAsset.canonical_host == "example.com"
        ).first()

        if not asset:
            asset = ApprovedAsset(
                organization_id=org.id,
                authorization_request_id=authz_req.id,
                canonical_host="example.com",
                scope_type="exact_host",
                permitted_categories=["dns", "tls", "http", "headers", "cookies", "server_leak"],
                valid_from=now - timedelta(days=5),
                expires_at=now + timedelta(days=90),
                status="active"
            )
            db.add(asset)
            logger.info("Seeded approved asset: example.com")

        db.commit()
        logger.info("Demo data seeding completed successfully.")

    except Exception as e:
        db.rollback()
        logger.error(f"Failed to seed demo data: {str(e)}", exc_info=True)
    finally:
        db.close()

if __name__ == "__main__":
    seed_demo_data()
