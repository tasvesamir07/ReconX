from datetime import timedelta
from sqlalchemy.orm import Session
from app.models.user import EmailOTP, User
from app.models.base import utc_now
from app.core.security import generate_otp_code, hash_token, constant_time_compare
from app.core.exceptions import ReconXException
from app.config import settings
from app.services.email_service import mail_provider

class OTPService:
    @staticmethod
    async def create_and_send_otp(db: Session, email: str, purpose: str, user_id: str = None) -> str:
        normalized_email = email.strip().lower()
        now = utc_now()

        # Check rate-limit cooldown
        recent_otp = db.query(EmailOTP).filter(
            EmailOTP.email == normalized_email,
            EmailOTP.purpose == purpose,
            EmailOTP.consumed_at.is_(None)
        ).order_by(EmailOTP.created_at.desc()).first()

        if recent_otp:
            time_since_creation = (now - recent_otp.created_at).total_seconds()
            if time_since_creation < settings.OTP_RESEND_COOLDOWN_SECONDS:
                remaining = int(settings.OTP_RESEND_COOLDOWN_SECONDS - time_since_creation)
                raise ReconXException(
                    429,
                    "OTP_COOLDOWN_ACTIVE",
                    f"Please wait {remaining} seconds before requesting a new verification code."
                )

        # Invalidate existing active OTPs for this email and purpose
        db.query(EmailOTP).filter(
            EmailOTP.email == normalized_email,
            EmailOTP.purpose == purpose,
            EmailOTP.consumed_at.is_(None)
        ).update({"consumed_at": now})

        # Generate 6-digit numeric OTP
        raw_code = generate_otp_code(6)
        hashed_code = hash_token(raw_code)
        expires_at = now + timedelta(seconds=settings.OTP_TTL_SECONDS)

        otp_record = EmailOTP(
            email=normalized_email,
            user_id=user_id,
            purpose=purpose,
            otp_hash=hashed_code,
            expires_at=expires_at,
            attempt_count=0
        )
        db.add(otp_record)
        db.commit()

        # Dispatch email
        subject = "Your ReconX Verification Code" if purpose == "email_verification" else "ReconX Password Reset Code"
        text = (
            f"Hello,\n\n"
            f"Your one-time verification code is: {raw_code}\n\n"
            f"This code will expire in {settings.OTP_TTL_SECONDS // 60} minutes.\n"
            f"If you did not request this, please ignore this email.\n\n"
            f"— The ReconX Security Team"
        )
        await mail_provider.send_mail(normalized_email, subject, text)
        return raw_code

    @staticmethod
    def verify_otp(db: Session, email: str, raw_code: str, purpose: str) -> EmailOTP:
        normalized_email = email.strip().lower()
        now = utc_now()

        otp_record = db.query(EmailOTP).filter(
            EmailOTP.email == normalized_email,
            EmailOTP.purpose == purpose,
            EmailOTP.consumed_at.is_(None)
        ).order_by(EmailOTP.created_at.desc()).first()

        if not otp_record:
            raise ReconXException(400, "INVALID_OTP", "Invalid or expired verification code.")

        if otp_record.expires_at < now:
            otp_record.consumed_at = now
            db.commit()
            raise ReconXException(400, "EXPIRED_OTP", "Verification code has expired. Please request a new one.")

        if otp_record.attempt_count >= settings.OTP_MAX_ATTEMPTS:
            otp_record.consumed_at = now
            db.commit()
            raise ReconXException(429, "MAX_ATTEMPTS_EXCEEDED", "Too many invalid attempts. Code invalidated.")

        # Constant-time verify
        expected_hash = hash_token(raw_code.strip())
        if not constant_time_compare(expected_hash, otp_record.otp_hash):
            otp_record.attempt_count += 1
            db.commit()
            raise ReconXException(400, "INVALID_OTP", "Invalid verification code.")

        # Mark consumed atomically
        otp_record.consumed_at = now
        db.commit()
        return otp_record
