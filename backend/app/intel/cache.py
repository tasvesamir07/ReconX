"""Cache stores for vulnerability-database responses."""
import logging
import threading
from datetime import timedelta
from typing import Any, Dict, Optional, Tuple

from app.models.base import utc_now

logger = logging.getLogger("reconx.intel.cache")


class MemoryCacheStore:
    """In-process cache (used in tests and as a fallback when the DB is unavailable)."""

    def __init__(self):
        self._data: Dict[str, Tuple[Any, Any]] = {}
        self._lock = threading.Lock()

    def get(self, key: str, max_age_hours: float) -> Tuple[Optional[Any], bool]:
        with self._lock:
            item = self._data.get(key)
        if not item:
            return None, False
        payload, fetched_at = item
        fresh = utc_now() - fetched_at <= timedelta(hours=max_age_hours)
        return payload, fresh

    def put(self, key: str, payload: Any) -> None:
        with self._lock:
            self._data[key] = (payload, utc_now())


class DatabaseCacheStore:
    """Postgres-backed cache (table intel_cache). Each call uses its own session,
    so it is safe to use from a worker thread."""

    def __init__(self, session_factory=None):
        if session_factory is None:
            from app.database import SessionLocal
            session_factory = SessionLocal
        self._session_factory = session_factory
        self._memory = MemoryCacheStore()

    def get(self, key: str, max_age_hours: float) -> Tuple[Optional[Any], bool]:
        payload, fresh = self._memory.get(key, max_age_hours)
        if payload is not None and fresh:
            return payload, True
        from app.models.intel import IntelCache
        try:
            with self._session_factory() as db:
                row = db.get(IntelCache, key)
                if not row:
                    return payload, False
                fetched_at = row.fetched_at
                if fetched_at.tzinfo is None:
                    from datetime import timezone
                    fetched_at = fetched_at.replace(tzinfo=timezone.utc)
                fresh = utc_now() - fetched_at <= timedelta(hours=max_age_hours)
                return row.payload, fresh
        except Exception as exc:  # DB problems must never break a scan
            logger.warning("Intel cache read failed for %s: %s", key, exc)
            return payload, False

    def put(self, key: str, payload: Any) -> None:
        self._memory.put(key, payload)
        from app.models.intel import IntelCache
        try:
            with self._session_factory() as db:
                row = db.get(IntelCache, key)
                if row:
                    row.payload = payload
                    row.fetched_at = utc_now()
                else:
                    db.add(IntelCache(key=key, payload=payload, fetched_at=utc_now()))
                db.commit()
        except Exception as exc:
            logger.warning("Intel cache write failed for %s: %s", key, exc)
