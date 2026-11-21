import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.base import utc_now

class Finding(Base):
    __tablename__ = "findings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scan_id = Column(UUID(as_uuid=True), ForeignKey("scans.id", ondelete="CASCADE"), nullable=False, index=True)
    
    finding_key = Column(String(150), nullable=False, index=True)  # e.g., SEC_HEADER_CSP_MISSING
    title = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False)  # headers, tls, dns, cookies, server_leak, input_validation
    severity = Column(String(50), nullable=False)  # informational, low, medium, high, critical
    confidence = Column(String(50), nullable=False)  # confirmed, likely, unconfirmed, informational
    status = Column(String(50), default="active", nullable=False)
    
    affected_asset = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    impact = Column(Text, nullable=False)
    remediation = Column(Text, nullable=False)
    references = Column(JSON, nullable=True)  # List of URLs or CVE references
    evidence_ids = Column(JSON, nullable=True)  # List of UUIDs of supporting evidence
    
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    scan = relationship("Scan", back_populates="findings")
