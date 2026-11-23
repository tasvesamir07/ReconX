"""Double-submit CSRF protection.

A random token is stored in a non-HttpOnly cookie and must be echoed in the
X-CSRF-Token header on every state-changing request that carries a session
cookie. Because a cross-origin attacker can neither read the cookie nor set
custom headers without an allowed CORS origin, forged requests are rejected.

This protection is required because production deployments may set the
session cookie to SameSite=None when the API and frontend live on different
registrable domains.
"""
import hmac
import secrets
from typing import Optional

from fastapi import Request, Response

from app.config import settings
from app.core.exceptions import ReconXException

UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}

# Public endpoints that must work before a user has a CSRF token.
CSRF_EXEMPT_PATHS = {
    "/api/v1/auth/login",
    "/api/v1/auth/register",
    "/api/v1/auth/verify-email",
    "/api/v1/auth/resend-verification",
    "/api/v1/auth/forgot-password",
    "/api/v1/auth/reset-password",
}


def generate_csrf_token() -> str:
    return secrets.token_urlsafe(32)


def set_csrf_cookie(response: Response, token: Optional[str] = None) -> str:
    token = token or generate_csrf_token()
    response.set_cookie(
        key=settings.CSRF_COOKIE_NAME,
        value=token,
        max_age=settings.SESSION_IDLE_TIMEOUT_MINUTES * 60,
        httponly=False,
        secure=settings.SESSION_COOKIE_SECURE,
        samesite=settings.cookie_samesite,
        path="/",
    )
    return token


def clear_csrf_cookie(response: Response) -> None:
    response.delete_cookie(
        settings.CSRF_COOKIE_NAME,
        path="/",
        secure=settings.SESSION_COOKIE_SECURE,
        samesite=settings.cookie_samesite,
    )


def enforce_csrf(request: Request) -> None:
    """Validate the double-submit token for cookie-authenticated writes."""
    if not settings.CSRF_ENABLED:
        return
    if request.method.upper() not in UNSAFE_METHODS:
        return
    if request.url.path.rstrip("/") in CSRF_EXEMPT_PATHS:
        return

    session_cookie = request.cookies.get(settings.SESSION_COOKIE_NAME)
    if not session_cookie:
        # Unauthenticated requests are rejected by the auth dependency; there
        # is no session-bound state to forge.
        return

    cookie_token = request.cookies.get(settings.CSRF_COOKIE_NAME)
    header_token = request.headers.get(settings.CSRF_HEADER_NAME)
    if not cookie_token or not header_token:
        raise ReconXException(
            403,
            "CSRF_TOKEN_MISSING",
            "A valid CSRF token is required for this request. Refresh the page and try again.",
        )
    if not hmac.compare_digest(cookie_token, header_token):
        raise ReconXException(
            403,
            "CSRF_TOKEN_INVALID",
            "CSRF validation failed. Refresh the page and try again.",
        )
