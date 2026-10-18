import logging
from fastapi import APIRouter, Depends
from app.database import db
from app.auth import get_current_user

router = APIRouter(prefix="/api/v1/users", tags=["Users"])
logger = logging.getLogger("awaazify.users")


@router.post("/me/sync")
def sync_current_user(current_user: dict = Depends(get_current_user)):
    """
    Server-side user sync. Idempotent: creates the public.users row if missing.
    New users get has_free_trial=True = 1 FREE full song cover (no Rs. 50 bonus).

    Response: {"bonus_granted": bool, "balance": int, "has_free_trial": bool}
    """
    user_id = current_user["id"]
    email = current_user.get("email")

    # 1. Get-or-create the user row (bonus starts at 0; the guarded credit
    # below is the ONLY path that grants it). The insert is race-safe: two
    # concurrent /me/sync calls may both see no row; the loser re-reads the
    # winner's row instead of 500ing.
    user_rows = db.select("users", {"id": f"eq.{user_id}"})
    if not user_rows:
        try:
            db.insert("users", {
                "id": user_id,
                "email": email,
                "name": None,
                "role": "user",
                "balance_pkr": 0,
                "balance_usd": 0,
                "song_credits": 0,
                "voice_passes": 0,
                "has_free_trial": True,
                "email_verified": True,
            })
        except Exception as exc:
            logger.info(f"users insert raced for {user_id} (concurrent sync won): {exc}")
        user_rows = db.select("users", {"id": f"eq.{user_id}"})
    user = user_rows[0] if user_rows else {}

    # 2. No Rs. 50 signup bonus anymore. New users get 1 FREE full song cover
    # via has_free_trial=True (set on row creation above). The free song is
    # consumed in covers.py when they generate their first cover.
    return {
        "bonus_granted": False,
        "balance": user.get("balance_pkr", 0),
        "has_free_trial": user.get("has_free_trial", False),
    }
