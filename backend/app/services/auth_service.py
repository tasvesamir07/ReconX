import uuid
from datetime import timedelta
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from app.models.user import User, Session as UserSession
from app.models.base import utc_now
from app.core.security import hash_password, verify_password, generate_secure_token, hash_token
from app.core.exceptions import ReconXException, AuthenticationError, ConflictError
from app.config import settings
from app.services.otp_service import OTPService

class AuthService:
    @staticmethod
    async def register(
        db: Session,
        email: str,
        password: str,
        display_name: str,
        phone_number: Optional[str] = None,
        account_type: str = "analyst",
        organization_name: Optional[str] = None
    ) -> User:
        normalized_email = email.strip().lower()
        existing = db.query(User).filter(User.email == normalized_email).first()
        if existing:
            raise ConflictError("An account with this email already exists.")

        is_moderator = account_type == "moderator"
        role = "MODERATOR" if is_moderator else "USER"

        user = User(
            email=normalized_email,
            display_name=display_name.strip(),
            phone_number=phone_number.strip() if phone_number else None,
            password_hash=hash_password(password),
            status="pending",
            platform_role=role
        )
        db.add(user)
        db.flush()

        # If Moderator registered with an Organization, automatically create it with this user as Owner
        if is_moderator and organization_name and len(organization_name.strip()) >= 2:
            from app.services.org_service import OrganizationService
            OrganizationService.create_organization(db, user, organization_name.strip())

        db.commit()
        db.refresh(user)

        # Dispatch verification OTP
        await OTPService.create_and_send_otp(db, user.email, "email_verification", str(user.id))
        return user

    @staticmethod
    def verify_email(db: Session, email: str, code: str) -> User:
        normalized_email = email.strip().lower()
        user = db.query(User).filter(User.email == normalized_email).first()
        if not user:
            raise ReconXException(404, "USER_NOT_FOUND", "Account not found.")

        OTPService.verify_otp(db, normalized_email, code, "email_verification")
        user.email_verified_at = utc_now()
        user.status = "active"
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def login(db: Session, email: str, password: str, ip: str = None, user_agent: str = None) -> Tuple[User, str]:
        normalized_email = email.strip().lower()
        user = db.query(User).filter(User.email == normalized_email).first()
        if not user or not user.password_hash or not verify_password(password, user.password_hash):
            raise AuthenticationError("Invalid email or password.")

        if user.status == "suspended":
            raise ReconXException(403, "ACCOUNT_SUSPENDED", "Your account has been suspended.")

        if not user.email_verified_at:
            raise ReconXException(403, "EMAIL_NOT_VERIFIED", "Please verify your email address before logging in.")

        # Create session record with opaque token
        raw_session_token = generate_secure_token(32)
        token_hash = hash_token(raw_session_token)
        now = utc_now()
        expires_at = now + timedelta(minutes=settings.SESSION_IDLE_TIMEOUT_MINUTES)

        session_record = UserSession(
            user_id=user.id,
            session_token_hash=token_hash,
            expires_at=expires_at,
            ip_address=ip,
            user_agent=user_agent,
            created_at=now
        )
        db.add(session_record)
        user.last_login_at = now
        db.commit()

        return user, raw_session_token

    @staticmethod
    def get_user_from_session_token(db: Session, raw_token: str) -> Optional[User]:
        if not raw_token:
            return None
        token_hash = hash_token(raw_token)
        now = utc_now()

        session_record = db.query(UserSession).filter(
            UserSession.session_token_hash == token_hash,
            UserSession.revoked_at.is_(None)
        ).first()

        if not session_record:
            return None

        if session_record.expires_at < now:
            session_record.revoked_at = now
            db.commit()
            return None

        # Slide idle timeout
        session_record.expires_at = now + timedelta(minutes=settings.SESSION_IDLE_TIMEOUT_MINUTES)
        db.commit()

        return session_record.user

    @staticmethod
    def logout(db: Session, raw_token: str):
        if not raw_token:
            return
        token_hash = hash_token(raw_token)
        session_record = db.query(UserSession).filter(UserSession.session_token_hash == token_hash).first()
        if session_record:
            session_record.revoked_at = utc_now()
            db.commit()

    @staticmethod
    def reset_password(db: Session, email: str, code: str, new_password: str) -> bool:
        normalized_email = email.strip().lower()
        user = db.query(User).filter(User.email == normalized_email).first()
        if not user:
            raise ReconXException(404, "USER_NOT_FOUND", "Account not found.")

        OTPService.verify_otp(db, normalized_email, code, "password_reset")
        user.password_hash = hash_password(new_password)
        # Revoke all existing sessions on password reset
        db.query(UserSession).filter(
            UserSession.user_id == user.id,
            UserSession.revoked_at.is_(None)
        ).update({"revoked_at": utc_now()})
        db.commit()
        return True
