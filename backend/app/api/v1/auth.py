from fastapi import APIRouter, Depends, Response, Request, status
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.models.user import User
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    VerifyEmailRequest,
    ResendVerificationRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    UserResponse,
    SessionUserResponse
)
from app.services.auth_service import AuthService
from app.services.otp_service import OTPService
from app.services.audit_service import AuditService
from app.api.deps import get_current_user, get_session_token
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(data: RegisterRequest, db: Session = Depends(get_db)):
    user = await AuthService.register(
        db,
        data.email,
        data.password,
        data.display_name,
        phone_number=data.phone_number,
        account_type=data.account_type or "analyst",
        organization_name=data.organization_name
    )
    AuditService.log(
        db, "user.register", "user", str(user.id),
        actor_id=user.id,
        metadata_json={"role": user.platform_role, "account_type": data.account_type}
    )
    return user

@router.post("/verify-email", response_model=UserResponse)
def verify_email(data: VerifyEmailRequest, db: Session = Depends(get_db)):
    user = AuthService.verify_email(db, data.email, data.otp)
    AuditService.log(db, "user.verify_email", "user", str(user.id), actor_id=user.id)
    return user

@router.post("/resend-verification")
async def resend_verification(data: ResendVerificationRequest, db: Session = Depends(get_db)):
    await OTPService.create_and_send_otp(db, data.email, "email_verification")
    return {"message": "Verification code sent if the email is registered."}

@router.post("/login", response_model=UserResponse)
def login(data: LoginRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("User-Agent")
    user, session_token = AuthService.login(db, data.email, data.password, client_ip, user_agent)

    # Set secure HTTP-only SameSite cookie
    # Cross-subdomain deployments (e.g. *.onrender.com or *.vercel.app) require SameSite=None + Secure
    samesite_val = "none" if settings.SESSION_COOKIE_SECURE else "lax"
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=session_token,
        max_age=settings.SESSION_IDLE_TIMEOUT_MINUTES * 60,
        httponly=True,
        secure=settings.SESSION_COOKIE_SECURE,
        samesite=samesite_val,
        path="/"
    )
    AuditService.log(db, "user.login", "user", str(user.id), actor_id=user.id, ip_address=client_ip)
    return user

@router.post("/logout")
def logout(response: Response, token: Optional[str] = Depends(get_session_token), db: Session = Depends(get_db)):
    if token:
        AuthService.logout(db, token)
    samesite_val = "none" if settings.SESSION_COOKIE_SECURE else "lax"
    response.delete_cookie(
        settings.SESSION_COOKIE_NAME,
        path="/",
        secure=settings.SESSION_COOKIE_SECURE,
        samesite=samesite_val
    )
    return {"message": "Logged out successfully."}

@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email.strip().lower()).first()
    if user:
        await OTPService.create_and_send_otp(db, user.email, "password_reset", str(user.id))
    return {"message": "If this email is registered, a password reset code has been sent."}

@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    AuthService.reset_password(db, data.email, data.otp, data.new_password)
    return {"message": "Password reset successfully. Please log in with your new password."}

@router.get("/me", response_model=SessionUserResponse)
def get_me(user: User = Depends(get_current_user)):
    return {
        "user": user,
        "active_organization_id": None,
        "role_in_active_organization": None
    }

@router.put("/profile", response_model=UserResponse)
def update_profile(
    data: dict,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    display_name = data.get("display_name")
    if display_name and len(display_name.strip()) >= 2:
        user.display_name = display_name.strip()

    if "phone_number" in data:
        user.phone_number = str(data["phone_number"]).strip() if data["phone_number"] else None

    if "avatar_url" in data:
        user.avatar_url = str(data["avatar_url"]).strip() if data["avatar_url"] else None

    if "bio" in data:
        user.bio = str(data["bio"]).strip() if data["bio"] else None

    db.commit()
    db.refresh(user)
    return user


