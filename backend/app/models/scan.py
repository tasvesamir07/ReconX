import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Text, JSON, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.base import utc_now

class Scan(Base):
    __tablename__ = "scans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True, index=True)
    requested_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    approved_asset_id = Column(UUID(as_uuid=True), ForeignKey("approved_assets.id", ondelete="RESTRICT"), nullable=False, index=True)
    
    target_url = Column(String(500), nullable=False)
    resolved_ip = Column(String(45), nullable=True)
    preset = Column(String(50), nullable=False)  # normal, moderate, ultimate
    
    # status: draft, validating, queued, provisioning, running, stopping, completed, partial, cancelled, failed, rejected
    status = Column(String(50), default="queued", nullable=False, index=True)
    budget_seconds_snapshot = Column(Integer, nullable=False)
    
    started_at = Column(DateTime(timezone=True), nullable=True)
    finished_at = Column(DateTime(timezone=True), nullable=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)
    
    summary_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    organization = relationship("Organization", back_populates="scans")
    requester = relationship("User", back_populates="scans")
    approved_asset = relationship("ApprovedAsset", back_populates="scans")
    
    events = relationship("ScanEvent", back_populates="scan", cascade="all, delete-orphan", order_by="ScanEvent.sequence_number")
    check_runs = relationship("CheckRun", back_populates="scan", cascade="all, delete-orphan")
    evidence_items = relationship("Evidence", back_populates="scan", cascade="all, delete-orphan")
    findings = relationship("Finding", back_populates="scan", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="scan", cascade="all, delete-orphan")

    @property
    def finding_count(self) -> int:
        return len(self.findings) if self.findings is not None else 0

    @property
    def has_report(self) -> bool:
        return bool(self.reports)

class ScanEvent(Base):
    __tablename__ = "scan_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scan_id = Column(UUID(as_uuid=True), ForeignKey("scans.id", ondelete="CASCADE"), nullable=False, index=True)
    sequence_number = Column(Integer, nullable=False)
    event_type = Column(String(50), nullable=False)  # lifecycle, check_start, check_complete, evidence_collected, ai_decision, warning, error
    severity = Column(String(50), default="info", nullable=False)  # info, low, medium, high, critical
    message = Column(Text, nullable=False)
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    scan = relationship("Scan", back_populates="events")

    __table_args__ = (
        UniqueConstraint("scan_id", "sequence_number", name="uq_scan_event_seq"),
    )

class CheckRun(Base):
    __tablename__ = "check_runs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scan_id = Column(UUID(as_uuid=True), ForeignKey("scans.id", ondelete="CASCADE"), nullable=False, index=True)
    capability_id = Column(String(100), nullable=False, index=True)
    status = Column(String(50), default="pending", nullable=False)  # pending, running, success, failed, timed_out, skipped
    started_at = Column(DateTime(timezone=True), nullable=True)
    finished_at = Column(DateTime(timezone=True), nullable=True)
    worker_id = Column(String(100), nullable=True)
    exit_code = Column(Integer, nullable=True)
    output_summary = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    scan = relationship("Scan", back_populates="check_runs")
    evidence_items = relationship("Evidence", back_populates="check_run")
