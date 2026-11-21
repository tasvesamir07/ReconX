"""
Additive schema upgrades for databases created before a column existed.

Base.metadata.create_all() creates missing tables but never alters existing
ones. This adds new nullable/defaulted columns in place so existing data is
kept. Each statement is idempotent (ADD COLUMN IF NOT EXISTS).
"""
import logging
from sqlalchemy import text
from sqlalchemy.engine import Engine

logger = logging.getLogger("reconx.schema")

_FINDING_COLUMNS = [
    ("finding_class", "VARCHAR(30) NOT NULL DEFAULT 'vulnerability'"),
    ("source", "VARCHAR(50) NOT NULL DEFAULT 'check'"),
    ("component", "VARCHAR(255)"),
    ("cve_ids", "JSON"),
    ("cwe_ids", "JSON"),
    ("cvss_score", "DOUBLE PRECISION"),
    ("cvss_vector", "VARCHAR(200)"),
    ("epss_score", "DOUBLE PRECISION"),
    ("epss_percentile", "DOUBLE PRECISION"),
    ("is_kev", "BOOLEAN NOT NULL DEFAULT FALSE"),
]


def upgrade_schema(engine: Engine) -> None:
    if engine.dialect.name != "postgresql":
        return
    with engine.begin() as conn:
        for name, ddl in _FINDING_COLUMNS:
            conn.execute(text(f"ALTER TABLE findings ADD COLUMN IF NOT EXISTS {name} {ddl}"))
    logger.info("Schema upgrade check complete (findings intelligence columns).")
