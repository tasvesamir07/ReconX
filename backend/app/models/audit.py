import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.base import utc_now

class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    actor_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True, index=True)
    
    action = Column(String(100), nullable=False, index=True)  # user.login, auth_request.approved, scan.created, etc.
    resource_type = Column(String(100), nullable=False)
    resource_id = Column(String(100), nullable=False)
    decision = Column(String(50), default="allowed", nullable=False)  # allowed, denied
    reason = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    metadata_json = Column(JSON, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    actor = relationship("User", foreign_keys=[actor_id])
    organization = relationship("Organization", foreign_keys=[organization_id])

class AIProviderEvent(Base):
    __tablename__ = "ai_provider_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scan_id = Column(UUID(as_uuid=True), ForeignKey("scans.id", ondelete="SET NULL"), nullable=True, index=True)
    
    provider = Column(String(50), nullable=False)  # groq, gemini
    model = Column(String(100), nullable=False)
    operation = Column(String(100), nullable=False)  # plan_next_check, extract_document, summarize_findings
    status = Column(String(50), nullable=False)  # success, fallback_triggered, failed
    latency_ms = Column(Integer, nullable=False)
    prompt_tokens = Column(Integer, nullable=True)
    completion_tokens = Column(Integer, nullable=True)
    error_code = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

class WorkerInstance(Base):
    __tablename__ = "worker_instances"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    host_identifier = Column(String(200), nullable=False)
    status = Column(String(50), default="ready", nullable=False)  # ready, busy, stopping, terminated
    capacity_slots = Column(Integer, default=3, nullable=False)
    active_slots = Column(Integer, default=0, nullable=False)
    heartbeat_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    started_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    terminated_at = Column(DateTime(timezone=True), nullable=True)
