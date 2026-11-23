"""Optional Cloudflare Turnstile verification for public forms.

When CAPTCHA_ENABLED is false (local development, tests) verification is a
no-op. In production set TURNSTILE_SECRET_KEY and enable the feature so
registration, password-reset and resend endpoints cannot be scripted.
"""
import logging
from typing import Optional

import httpx

from app.config import settings
from app.core.exceptions import ReconXException

logger = logging.getLogger("reconx.captcha")


class CaptchaService:
    @staticmethod
    async def verify(token: Optional[str], remote_ip: Optional[str] = None) -> None:
        if not settings.CAPTCHA_ENABLED:
            return
        if not settings.TURNSTILE_SECRET_KEY:
            logger.error("CAPTCHA_ENABLED is true but TURNSTILE_SECRET_KEY is not configured.")
            raise ReconXException(
                503,
                "CAPTCHA_UNAVAILABLE",
                "Human verification is temporarily unavailable. Please try again later.",
            )
        if not token:
            raise ReconXException(
                400,
                "CAPTCHA_REQUIRED",
                "Please complete the human verification challenge.",
            )

        payload = {"secret": settings.TURNSTILE_SECRET_KEY, "response": token}
        if remote_ip:
            payload["remoteip"] = remote_ip

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(settings.TURNSTILE_VERIFY_URL, data=payload)
                data = response.json()
        except Exception as exc:  # network/provider failure -> fail closed
            logger.warning("CAPTCHA verification request failed: %s", exc)
            raise ReconXException(
                503,
                "CAPTCHA_UNAVAILABLE",
                "Human verification is temporarily unavailable. Please try again later.",
            )

        if not data.get("success"):
            raise ReconXException(
                400,
                "CAPTCHA_FAILED",
                "Human verification failed. Please try again.",
            )
