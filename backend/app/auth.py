"""
Server-side authentication for the Awaazify FastAPI backend.

SECURITY MODEL:
- Every protected route MUST depend on ``get_current_user`` (or ``require_admin``).
- The Supabase access JWT is verified server-side against the Supabase Auth API
  on every request. A missing, malformed, or expired token yields HTTP 401.
- The ``user_id`` used by a route ALWAYS comes from the verified token.
  Client-supplied ``userId`` fields / query params are accepted for backwards
  compatibility but are IGNORED for authorization and billing.
- Admin routes additionally depend on ``require_admin``, which allowlists a
  SINGLE admin Gmail address: the verified caller's email (from the Supabase
  JWT, i.e. their Google account) must match the ``ADMIN_EMAIL`` server env var
  (case-insensitive). The database ``role`` column is NOT used for admin gating.
  If ``ADMIN_EMAIL`` is unset, every admin route answers 503. Denied attempts
  are logged with the caller's email.
"""
import logging
import os
from typing import Dict, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.database import supabase_client

logger = logging.getLogger("awaazify.auth")

# Single admin identity: the ONE Gmail address allowed into the admin panel.
# Set ADMIN_EMAIL on the server (Railway env var). The caller's email comes
# from their verified Supabase JWT (Google OAuth), so it cannot be spoofed.
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "").strip().lower()

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


def is_admin_email(email: Optional[str]) -> bool:
    """True when the given email matches the configured admin address."""
    return bool(ADMIN_EMAIL) and bool(email) and email.strip().lower() == ADMIN_EMAIL


async def require_admin(
    current_user: Dict[str, str] = Depends(get_current_user),
) -> Dict[str, str]:
    """
    FastAPI dependency: require a valid JWT AND the admin Gmail address.

    The caller's email comes from the verified Supabase JWT (Google OAuth) and
    must match ADMIN_EMAIL. 503 when ADMIN_EMAIL is not configured on the
    server; 403 on mismatch. Every denied attempt is logged.
    """
    if not ADMIN_EMAIL:
        logger.error("Admin route accessed but ADMIN_EMAIL is not configured.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Admin access is not configured on the server.",
        )
    email = current_user.get("email")
    if not is_admin_email(email):
        logger.warning(
            f"Forbidden admin-route access attempt by user={current_user.get('id')} email={email!r}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required.",
        )
    return current_user
