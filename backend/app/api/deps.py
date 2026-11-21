from fastapi import Depends, Request, Response, Cookie
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID
from app.database import get_db
from app.models.user import User
from app.services.auth_service import AuthService
from app.services.org_service import OrganizationService
from app.core.exceptions import AuthenticationError, PermissionDeniedError
from app.config import settings

def get_session_token(
    request: Request,
    reconx_session: Optional[str] = Cookie(None, alias=settings.SESSION_COOKIE_NAME)
) -> Optional[str]:
    # Check Cookie first
    if reconx_session:
        return reconx_session
    # Fallback to Authorization: Bearer <token>
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header[7:].strip()
    return None

def get_current_user(
    token: Optional[str] = Depends(get_session_token),
    db: Session = Depends(get_db)
) -> User:
    if not token:
        raise AuthenticationError("Authentication session required.")
    user = AuthService.get_user_from_session_token(db, token)
    if not user:
        raise AuthenticationError("Session expired or invalid. Please log in again.")
    if user.status != "active":
        raise PermissionDeniedError("Your account is not active.")
    return user

def require_platform_role(*allowed_roles: str):
    def dependency(user: User = Depends(get_current_user)) -> User:
        if user.platform_role not in allowed_roles and user.platform_role != "SUPER_ADMIN":
            raise PermissionDeniedError(
                f"Action requires one of platform roles: {', '.join(allowed_roles)}. Your role: {user.platform_role}"
            )
        return user
    return dependency

def require_org_membership(
    org_id: UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> str:
    role = OrganizationService.get_user_role_in_org(db, user.id, org_id)
    if not role and user.platform_role != "SUPER_ADMIN":
        raise PermissionDeniedError("You are not a member of this organization.")
    return role or "OWNER"
