"""In-process sliding-window rate limiting.

This is intentionally dependency-free. It protects a single API instance
(which matches the current single-service deployment). If ReconX is ever
scaled to multiple API replicas, move the counters to Redis so every replica
shares the same budget.
"""
import threading
import time
from collections import defaultdict, deque
from typing import Deque, Dict, Optional

from fastapi import Request

from app.config import settings
from app.core.exceptions import ReconXException

_WINDOW_SECONDS = 60.0
_MAX_TRACKED_KEYS = 20000


class SlidingWindowLimiter:
    def __init__(self) -> None:
        self._hits: Dict[str, Deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def check(self, key: str, limit: int, window_seconds: float = _WINDOW_SECONDS) -> None:
        if not settings.RATE_LIMIT_ENABLED or limit <= 0:
            return

        now = time.monotonic()
        with self._lock:
            hits = self._hits[key]
            cutoff = now - window_seconds
            while hits and hits[0] <= cutoff:
                hits.popleft()

            if len(hits) >= limit:
                retry_after = max(1, int(window_seconds - (now - hits[0])) + 1)
                raise ReconXException(
                    429,
                    "RATE_LIMITED",
                    f"Too many requests. Please retry in {retry_after} seconds.",
                    {"retry_after": retry_after},
                )

            hits.append(now)

            # Bound memory usage from one-off client addresses.
            if len(self._hits) > _MAX_TRACKED_KEYS:
                for stale_key in [k for k, v in self._hits.items() if not v]:
                    del self._hits[stale_key]


limiter = SlidingWindowLimiter()


def client_ip(request: Request) -> str:
    """Best-effort client address for rate limiting and audit records.

    Behind Render/nginx the platform appends the real client address to
    X-Forwarded-For. We only trust it when explicitly configured.
    """
    if settings.TRUST_PROXY_HEADERS:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            first = forwarded.split(",")[0].strip()
            if first:
                return first
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip.strip()
    return request.client.host if request.client else "unknown"


def limit_auth_requests(request: Request) -> None:
    """Dependency for public authentication endpoints."""
    limiter.check(
        f"auth:{client_ip(request)}",
        settings.AUTH_RATE_LIMIT_PER_MINUTE,
    )


def limit_login_attempts(request: Request) -> None:
    """Stricter per-IP budget for the credential endpoint."""
    limiter.check(f"login:{client_ip(request)}", settings.LOGIN_MAX_FAILED_ATTEMPTS * 2)
