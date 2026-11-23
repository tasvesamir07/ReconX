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
    ProfileUpdateRequest,
    UserResponse,
    SessionUserResponse
)
from app.services.auth_service import AuthService
from app.services.otp_service import OTPService
from app.services.audit_service import AuditService
from app.services.captcha_service import CaptchaService
from app.api.deps import get_current_user, get_session_token
from app.config import settings
from app.core.csrf import clear_csrf_cookie, set_csrf_cookie
from app.core.exceptions import PolicyViolationError
from app.core.rate_limit import client_ip, limit_auth_requests, limit_login_attempts

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(limit_auth_requests)],
)
async def register(data: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    await CaptchaService.verify(data.captcha_token, client_ip(request))
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

@router.post("/resend-verification", dependencies=[Depends(limit_auth_requests)])
async def resend_verification(
    data: ResendVerificationRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    await CaptchaService.verify(data.captcha_token, client_ip(request))
    await OTPService.create_and_send_otp(db, data.email, "email_verification")
    return {"message": "Verification code sent if the email is registered."}

@router.post(
    "/login",
    response_model=UserResponse,
    dependencies=[Depends(limit_auth_requests), Depends(limit_login_attempts)],
)
def login(data: LoginRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    request_ip = client_ip(request)
    user_agent = request.headers.get("User-Agent")
    user, session_token = AuthService.login(db, data.email, data.password, request_ip, user_agent)

    # Secure HTTP-only session cookie. SameSite=None is only used when the
    # deployment is genuinely cross-site (requires Secure); CSRF tokens are
    # enforced on every unsafe request regardless.
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=session_token,
        max_age=settings.SESSION_IDLE_TIMEOUT_MINUTES * 60,
        httponly=True,
        secure=settings.SESSION_COOKIE_SECURE,
        samesite=settings.cookie_samesite,
        path="/"
    )
    csrf_token = set_csrf_cookie(response)
    # Exposed for deployments where the API remains on a different origin and
    # the cookie is not readable from the frontend's document.cookie.
    response.headers[settings.CSRF_HEADER_NAME] = csrf_token
    AuditService.log(db, "user.login", "user", str(user.id), actor_id=user.id, ip_address=request_ip)
    return user

@router.post("/logout")
def logout(response: Response, token: Optional[str] = Depends(get_session_token), db: Session = Depends(get_db)):
    if token:
        AuthService.logout(db, token)
    response.delete_cookie(
        settings.SESSION_COOKIE_NAME,
        path="/",
        secure=settings.SESSION_COOKIE_SECURE,
        samesite=settings.cookie_samesite
    )
    clear_csrf_cookie(response)
    return {"message": "Logged out successfully."}

@router.post("/forgot-password", dependencies=[Depends(limit_auth_requests)])
async def forgot_password(
    data: ForgotPasswordRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    await CaptchaService.verify(data.captcha_token, client_ip(request))
    user = db.query(User).filter(User.email == data.email.strip().lower()).first()
    if user:
        await OTPService.create_and_send_otp(db, user.email, "password_reset", str(user.id))
    return {"message": "If this email is registered, a password reset code has been sent."}

@router.post("/reset-password", dependencies=[Depends(limit_auth_requests)])
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    AuthService.reset_password(db, data.email, data.otp, data.new_password)
    return {"message": "Password reset successfully. Please log in with your new password."}

@router.get("/me", response_model=SessionUserResponse)
def get_me(response: Response, request: Request, user: User = Depends(get_current_user)):
    # Ensure existing sessions (created before CSRF support) receive a token.
    if not request.cookies.get(settings.CSRF_COOKIE_NAME):
        csrf_token = set_csrf_cookie(response)
        response.headers[settings.CSRF_HEADER_NAME] = csrf_token
    return {
        "user": user,
        "active_organization_id": None,
        "role_in_active_organization": None
    }

@router.put("/profile", response_model=UserResponse)
def update_profile(
    data: ProfileUpdateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if data.display_name is not None:
        user.display_name = data.display_name.strip()

    if data.phone_number is not None:
        user.phone_number = data.phone_number.strip() or None

    if data.avatar_url is not None:
        avatar_url = data.avatar_url.strip()
        if avatar_url:
            from urllib.parse import urlparse
            parsed = urlparse(avatar_url)
            if parsed.scheme not in ("http", "https") or not parsed.netloc:
                raise PolicyViolationError(
                    "INVALID_AVATAR_URL",
                    "Avatar URL must be an absolute http(s) URL.",
                )
            user.avatar_url = avatar_url
        else:
            user.avatar_url = None

    if data.bio is not None:
        user.bio = data.bio.strip() or None

    db.commit()
    db.refresh(user)
    return user


