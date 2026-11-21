from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from uuid import UUID

class OrgCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    slug: Optional[str] = None

class OrgUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=150)

class OrgResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    slug: str
    status: str
    created_at: datetime
    role: Optional[str] = None

class MemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    email: str
    display_name: str
    role: str
    status: str
    joined_at: datetime

class InviteRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    role: str = Field("ANALYST", pattern="^(ADMIN|ANALYST|VIEWER)$")

class InvitationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    organization_id: UUID
    email: str
    role: str
    expires_at: datetime
    created_at: datetime

class AcceptInvitationRequest(BaseModel):
    token: str
