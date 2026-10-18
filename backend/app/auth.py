"""
Server-side authentication for the Awaazify FastAPI backend.

SECURITY MODEL (P0 hardening):
- Every protected route MUST depend on ``get_current_user`` (or ``require_admin``).
- The Supabase access JWT is verified server-side against the Supabase Auth API
  on every request. A missing, malformed, or expired token yields HTTP 401.
- The ``user_id`` used by a route ALWAYS comes from the verified token.
  Client-supplied ``userId`` fields / query params are accepted for backwards
  compatibility but are IGNORED for authorization and billing.
- Admin routes additionally depend on ``require_admin``, which reads the
  caller's ``role`` from ``public.users`` server-side (per-request DB read).
  No client-side PIN/OTP is trusted.
"""
import logging
from typing import Dict

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.database import db, supabase_client

logger = logging.getLogger("awaazify.auth")

_bearer_scheme = HTTPBearer(auto_error=False)


def _verify_supabase_jwt(token: str) -> Dict[str, str]:
    """
    Verify a Supabase access JWT server-side via the Supabase Auth API.

    Returns ``{"id": <uuid>, "email": <email>}`` for a valid token.
    Raises HTTP 401 for invalid/expired tokens, HTTP 503 when auth is
    not configured on the backend.
    """
    if supabase_client is None:
        logger.error("Supabase client is not configured; cannot verify auth token.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service is not configured on the server.",
        )
    try:
        # get_user(token) validates the JWT against the Supabase Auth server.
        response = supabase_client.auth.get_user(token)
        user = response.user if response else None
        if not user or not getattr(user, "id", None):
            raise ValueError("get_user returned no user")
        return {"id": str(user.id), "email": getattr(user, "email", None)}
    except HTTPException:
        raise
    except Exception as exc:  # invalid / expired token, network failure, etc.
        logger.warning(f"Supabase JWT verification failed: {exc}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
) -> Dict[str, str]:
    """
    FastAPI dependency: require a valid ``Authorization: Bearer <Supabase JWT>``
    header and return the verified caller's identity.
    """
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization: Bearer token.",
        )
    return _verify_supabase_jwt(credentials.credentials)


async def require_admin(
    current_user: Dict[str, str] = Depends(get_current_user),
) -> Dict[str, str]:
    """
    FastAPI dependency: require a valid JWT AND ``role == 'admin'``.

    The role is read server-side from ``public.users`` on every request, so
    revoking admin in the database takes effect immediately.
    """
    rows = db.select("users", {"id": f"eq.{current_user['id']}"})
    role = rows[0].get("role") if rows else None
    if role != "admin":
        logger.warning(
            f"Forbidden admin-route access attempt by user={current_user['id']} (role={role!r})"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required.",
        )
    return current_user
