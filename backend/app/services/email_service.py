import logging
from abc import ABC, abstractmethod
from typing import Optional
from app.config import settings

logger = logging.getLogger("reconx.email")

class BaseMailProvider(ABC):
    @abstractmethod
    async def send_mail(self, to_email: str, subject: str, body_text: str, body_html: Optional[str] = None) -> bool:
        pass

class LocalMailProvider(BaseMailProvider):
    """Local mail provider for development and testing. Stores sent emails in memory and logs them."""
    sent_emails = []

    async def send_mail(self, to_email: str, subject: str, body_text: str, body_html: Optional[str] = None) -> bool:
        email_record = {
            "to": to_email,
            "subject": subject,
            "text": body_text,
            "html": body_html
        }
        self.sent_emails.append(email_record)
        logger.info(f"📧 [LOCAL EMAIL DISPATCHED] To: {to_email} | Subject: {subject}\n{body_text}\n")
        return True

class ResendMailProvider(BaseMailProvider):
    """Resend API email adapter."""
    def __init__(self, api_key: str):
        self.api_key = api_key

    async def send_mail(self, to_email: str, subject: str, body_text: str, body_html: Optional[str] = None) -> bool:
        import httpx
        url = "https://api.resend.com/emails"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "from": settings.EMAIL_FROM,
            "to": [to_email],
            "subject": subject,
            "text": body_text,
            "html": body_html or body_text
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code in (200, 201):
                return True
            logger.error(f"Failed to send email via Resend: {resp.status_code} {resp.text}")
            return False

def get_mail_provider() -> BaseMailProvider:
    if settings.EMAIL_PROVIDER == "resend" and settings.RESEND_API_KEY:
        return ResendMailProvider(settings.RESEND_API_KEY)
    return LocalMailProvider()

mail_provider = get_mail_provider()
