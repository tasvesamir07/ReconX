import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.base import utc_now

class Report(Base):
    __tablename__ = "reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scan_id = Column(UUID(as_uuid=True), ForeignKey("scans.id", ondelete="CASCADE"), nullable=False, index=True)
    
    status = Column(String(50), default="completed", nullable=False)  # draft, generating, completed, partial, failed
    format = Column(String(50), default="json", nullable=False)  # json, pdf, html
    storage_path = Column(String(500), nullable=True)
    content_hash = Column(String(64), nullable=True)
    generated_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    scan = relationship("Scan", back_populates="reports")
