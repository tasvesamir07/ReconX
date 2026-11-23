from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID

class ScopeDefinition(BaseModel):
    domains: List[str]
    allow_subdomains: bool = False
    permitted_categories: List[str] = ["dns", "tls", "http", "headers"]

class AuthRequestCreate(BaseModel):
    organization_id: Optional[UUID] = None
    company_name: str = Field(..., min_length=2, max_length=200)
    employee_name: str = Field(..., min_length=2, max_length=150)
    contact_email: str = Field(..., min_length=3, max_length=255)
    requested_domains: List[str]
    allow_subdomains: bool = False
    requested_start_at: datetime
    requested_expiry_at: datetime

# File upload constants
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
    "text/plain",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
MAX_FILENAME_LENGTH = 255

class AuthRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    organization_id: Optional[UUID] = None
    requested_by: UUID
    company_name: str
    employee_name: str
    contact_email: str
    status: str
    requested_scope: Dict[str, Any]
    requested_start_at: datetime
    requested_expiry_at: datetime
    ai_extraction_status: str
    ai_extracted_fields: Optional[Dict[str, Any]] = None
    ai_flags: Optional[List[Dict[str, Any]]] = None
    moderator_id: Optional[UUID] = None
    moderator_decision_at: Optional[datetime] = None
    moderator_reason: Optional[str] = None
    created_at: datetime

class ModeratorDecisionRequest(BaseModel):
    decision: str = Field(..., pattern="^(approved|rejected|info_requested)$")
    reason: str = Field(..., min_length=5)
    approved_domains: Optional[List[str]] = None
    allow_subdomains: Optional[bool] = None
    # Explicit confirmation required when changing subdomain scope from the original request
    subdomain_scope_confirmed: bool = Field(
        default=False, 
        description="Must be true when allow_subdomains differs from the original request's allow_subdomains value"
    )
    permitted_categories: Optional[List[str]] = ["dns", "tls", "http", "headers"]
    approved_expiry_at: Optional[datetime] = None

class ScopeActionRequest(BaseModel):
    password: str = Field(..., min_length=1, description="Operator password for identity re-authentication")
    reason: Optional[str] = Field(None, max_length=500)

class ApprovedAssetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    organization_id: Optional[UUID] = None
    authorization_request_id: UUID
    canonical_host: str
    scope_type: str
    permitted_categories: List[str]
    valid_from: datetime
    expires_at: datetime
    status: str
    created_at: datetime
    revoked_at: Optional[datetime] = None

class AuthorizationDocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    authorization_request_id: UUID
    original_filename: str
    detected_mime_type: str
    file_size: int
    sha256_hash: str
    upload_status: str
    created_at: datetime
