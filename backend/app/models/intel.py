from sqlalchemy import Column, String, DateTime, JSON
from app.database import Base
from app.models.base import utc_now


class IntelCache(Base):
    """Cached responses from vulnerability databases (NVD, OSV, KEV, EPSS).

    Keeps scans fast, stays within public API rate limits, and makes repeat
    scans of the same target use the same data snapshot.
    """
    __tablename__ = "intel_cache"

    key = Column(String(300), primary_key=True)
    payload = Column(JSON, nullable=False)
    fetched_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
