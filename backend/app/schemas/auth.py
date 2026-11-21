from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
from uuid import UUID

class RegisterRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=8, max_length=128)
    display_name: str = Field(..., min_length=2, max_length=100)
    phone_number: Optional[str] = None
    account_type: Optional[str] = "analyst"  # "analyst" or "moderator"
    organization_name: Optional[str] = None

class LoginRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    password: str

class VerifyEmailRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    otp: str = Field(..., min_length=6, max_length=6)

class ResendVerificationRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)

class ForgotPasswordRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)

class ResetPasswordRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    otp: str = Field(..., min_length=6, max_length=6)
    new_password: str = Field(..., min_length=8, max_length=128)

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    display_name: str
    phone_number: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    status: str
    platform_role: str
    email_verified_at: Optional[datetime] = None
    created_at: datetime

class SessionUserResponse(BaseModel):
    user: UserResponse
    active_organization_id: Optional[UUID] = None
    role_in_active_organization: Optional[str] = None
