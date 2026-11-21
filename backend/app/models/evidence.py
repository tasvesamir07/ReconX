import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Float, JSON, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.base import utc_now

class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scan_id = Column(UUID(as_uuid=True), ForeignKey("scans.id", ondelete="CASCADE"), nullable=False, index=True)
    check_run_id = Column(UUID(as_uuid=True), ForeignKey("check_runs.id", ondelete="SET NULL"), nullable=True, index=True)
    
    evidence_type = Column(String(100), nullable=False, index=True)  # header, tls_cert, dns_record, http_response, cookie, technology_flag
    normalized_data = Column(JSON, nullable=False)
    source = Column(String(100), nullable=False)  # tool or parser name
    confidence = Column(Float, default=1.0, nullable=False)
    content_hash = Column(String(64), nullable=False)
    observed_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    scan = relationship("Scan", back_populates="evidence_items")
    check_run = relationship("CheckRun", back_populates="evidence_items")
