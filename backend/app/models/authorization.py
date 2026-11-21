import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, JSON, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.base import TimestampMixin, utc_now

class AuthorizationRequest(Base, TimestampMixin):
    __tablename__ = "authorization_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True, index=True)
    requested_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    
    company_name = Column(String(200), nullable=False)
    employee_name = Column(String(150), nullable=False)
    contact_email = Column(String(255), nullable=False)
    
    # status: draft, submitted, under_review, info_requested, approved, rejected, expired
    status = Column(String(50), default="submitted", nullable=False, index=True)
    
    requested_scope = Column(JSON, nullable=False)  # {"domains": ["example.com"], "allow_subdomains": false, "categories": ["headers", "dns", "tls"]}
    requested_start_at = Column(DateTime(timezone=True), nullable=False)
    requested_expiry_at = Column(DateTime(timezone=True), nullable=False)
    
    ai_extraction_status = Column(String(50), default="pending", nullable=False)  # pending, completed, failed
    ai_extracted_fields = Column(JSON, nullable=True)
    ai_flags = Column(JSON, nullable=True)  # List of consistency flags / warnings
    
    moderator_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    moderator_decision_at = Column(DateTime(timezone=True), nullable=True)
    moderator_reason = Column(Text, nullable=True)

    organization = relationship("Organization", back_populates="authorizations")
    requester = relationship("User", foreign_keys=[requested_by], back_populates="authorizations")
    moderator = relationship("User", foreign_keys=[moderator_id])
    documents = relationship("AuthorizationDocument", back_populates="authorization_request", cascade="all, delete-orphan")
    approved_assets = relationship("ApprovedAsset", back_populates="authorization_request", cascade="all, delete-orphan")

class AuthorizationDocument(Base):
    __tablename__ = "authorization_documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    authorization_request_id = Column(UUID(as_uuid=True), ForeignKey("authorization_requests.id", ondelete="CASCADE"), nullable=False, index=True)
    storage_path = Column(String(500), nullable=False)
    original_filename = Column(String(255), nullable=False)
    detected_mime_type = Column(String(100), nullable=False)
    file_size = Column(Integer, nullable=False)
    sha256_hash = Column(String(64), nullable=False)
    upload_status = Column(String(50), default="uploaded", nullable=False)  # uploaded, scanned_safe, rejected
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    authorization_request = relationship("AuthorizationRequest", back_populates="documents")

class ApprovedAsset(Base):
    __tablename__ = "approved_assets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True, index=True)
    authorization_request_id = Column(UUID(as_uuid=True), ForeignKey("authorization_requests.id", ondelete="RESTRICT"), nullable=False, index=True)
    
    canonical_host = Column(String(255), nullable=False, index=True)  # normalized lowercase
    scope_type = Column(String(50), default="exact_host", nullable=False)  # exact_host, wildcard_subdomains
    permitted_categories = Column(JSON, nullable=False)  # ["dns", "tls", "http", "headers"]
    
    valid_from = Column(DateTime(timezone=True), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    status = Column(String(50), default="active", nullable=False)  # active, revoked, expired
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)

    organization = relationship("Organization", back_populates="approved_assets")
    authorization_request = relationship("AuthorizationRequest", back_populates="approved_assets")
    scans = relationship("Scan", back_populates="approved_asset")
