import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, JSON, Float, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.base import utc_now

# finding_class values
VULNERABILITY = "vulnerability"   # exploitable flaw: CVE, exposed secret, open redirect, ...
HARDENING = "hardening"           # missing defence: headers, cookie flags, weak TLS, email auth
INVENTORY = "inventory"           # attack-surface information: technologies, ports, policies


class Finding(Base):
    __tablename__ = "findings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scan_id = Column(UUID(as_uuid=True), ForeignKey("scans.id", ondelete="CASCADE"), nullable=False, index=True)

    finding_key = Column(String(150), nullable=False, index=True)  # e.g., SEC_HEADER_CSP_MISSING, CVE:CVE-2021-41773:apache_httpd
    title = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False)  # headers, tls, dns, cookies, cve, exposure, ...
    severity = Column(String(50), nullable=False)  # informational, low, medium, high, critical
    # confirmed: directly observed or actively verified on the target
    # likely:    inferred from a detected version that a vulnerability database lists as affected
    confidence = Column(String(50), nullable=False)
    status = Column(String(50), default="active", nullable=False)

    affected_asset = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    impact = Column(Text, nullable=False)
    remediation = Column(Text, nullable=False)
    references = Column(JSON, nullable=True)  # List of URLs
    evidence_ids = Column(JSON, nullable=True)  # List of UUIDs of supporting evidence

    # Vulnerability-intelligence fields
    finding_class = Column(String(30), default=VULNERABILITY, nullable=False)
    source = Column(String(50), default="check", nullable=False)  # check | nvd | osv | nuclei
    component = Column(String(255), nullable=True)  # e.g. "Apache HTTP Server 2.4.49"
    cve_ids = Column(JSON, nullable=True)
    cwe_ids = Column(JSON, nullable=True)
    cvss_score = Column(Float, nullable=True)
    cvss_vector = Column(String(200), nullable=True)
    epss_score = Column(Float, nullable=True)
    epss_percentile = Column(Float, nullable=True)
    is_kev = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    scan = relationship("Scan", back_populates="findings")
