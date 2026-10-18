"""
In-memory sliding-window rate limiter (P2 hardening).

Dependency-free: no Redis, no extra packages. Each worker process keeps its
own counters, which is fine for this app's traffic profile.

- Keyed by authenticated user id + request path when a Bearer token is
  present (stable per account even when the client IP rotates behind
  proxies — observed on Railway where each request arrives from a different
  internal IP); falls back to client IP + path for unauthenticated requests.
- Applies to /api/* routes only (health/docs/root are exempt).
- Default budget: ``requests_per_minute`` per key per 60s sliding window.
- Abuse-sensitive endpoints (login/sync, payments) get a stricter budget.
- Over the budget -> HTTP 429 JSON with a ``Retry-After`` header (seconds).

The JWT ``sub`` is only *decoded*, never trusted here — real verification
happens later in the route's auth dependency. A forged token still gets a
cheap 401; only genuine per-account usage consumes the budget.
"""
import base64
import json
import logging
import threading
import time
from collections import deque
from typing import Deque, Dict, Optional, Tuple

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

logger = logging.getLogger("awaazify.rate_limit")

# Paths that never count against the budget.
EXEMPT_PATHS = frozenset({"/", "/api", "/health", "/api/health"})

# Abuse-sensitive endpoints: exact paths or prefixes with a stricter budget.
STRICT_PREFIXES: Tuple[str, ...] = (
    "/api/v1/users/me/sync",  # login-adjacent user sync / signup bonus
    "/api/v1/payments",        # payment submission + verification
)

# Bound on tracked IP+path buckets; oldest-idle buckets are purged past this.
MAX_BUCKETS = 20000
WINDOW_SECONDS = 60.0


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app,
        requests_per_minute: int = 60,
        strict_per_minute: int = 20,
    ):
        super().__init__(app)
        self.default_limit = max(1, int(requests_per_minute))
        self.strict_limit = max(1, int(strict_per_minute))
        self._hits: Dict[str, Deque[float]] = {}
        self._lock = threading.Lock()

    @staticmethod
    def _client_ip(request: Request) -> str:
        xff = request.headers.get("x-forwarded-for")
        if xff:
            return xff.split(",")[0].strip() or "unknown"
        return request.client.host if request.client else "unknown"

    @staticmethod
    def _jwt_sub(request: Request) -> Optional[str]:
        """Extract the ``sub`` claim from a Bearer token WITHOUT verifying.

        Verification happens later in the route's auth dependency; here the
        sub is only a stable rate-limit key. Returns None when absent or
        undecodable.
        """
        auth = request.headers.get("authorization", "")
        if not auth.lower().startswith("bearer "):
            return None
        token = auth[7:].strip()
        parts = token.split(".")
        if len(parts) != 3:
            return None
        try:
            payload_b64 = parts[1] + "=" * (-len(parts[1]) % 4)
            payload = json.loads(base64.urlsafe_b64decode(payload_b64).decode("utf-8"))
            sub = payload.get("sub")
            return str(sub) if sub else None
        except Exception:
            return None

    def _request_key(self, request: Request, path: str) -> str:
        sub = self._jwt_sub(request)
        if sub:
            return f"user:{sub}:{path}"
        return f"ip:{self._client_ip(request)}:{path}"

    @staticmethod
    def _is_strict(path: str) -> bool:
        return any(path.startswith(prefix) for prefix in STRICT_PREFIXES)

    def _purge_idle_buckets(self, now: float) -> None:
        """Drop buckets idle for a full window once we exceed MAX_BUCKETS."""
        if len(self._hits) <= MAX_BUCKETS:
            return
        cutoff = now - WINDOW_SECONDS
        stale = [
            key for key, dq in self._hits.items()
            if not dq or dq[-1] <= cutoff
        ]
        for key in stale:
            self._hits.pop(key, None)

    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # Only /api/* is limited; everything else (health, docs, root) passes.
        if not path.startswith("/api/") or path in EXEMPT_PATHS:
            return await call_next(request)

        limit = self.strict_limit if self._is_strict(path) else self.default_limit
        key = self._request_key(request, path)
        now = time.monotonic()

        with self._lock:
            dq = self._hits.get(key)
            if dq is None:
                dq = self._hits[key] = deque()
            cutoff = now - WINDOW_SECONDS
            while dq and dq[0] <= cutoff:
                dq.popleft()
            if len(dq) >= limit:
                retry_after = max(1, int(dq[0] + WINDOW_SECONDS - now) + 1)
                logger.warning(
                    f"Rate limit exceeded: key={key} "
                    f"limit={limit}/min"
                )
                response = JSONResponse(
                    status_code=429,
                    content={"detail": "Rate limit exceeded. Please slow down and retry."},
                )
                response.headers["Retry-After"] = str(retry_after)
            else:
                dq.append(now)
                response = None
            self._purge_idle_buckets(now)

        if response is not None:
            return response
        return await call_next(request)
