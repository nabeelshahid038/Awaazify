import logging
import uuid
from fastapi import APIRouter, Depends
from app.database import db
from app.auth import get_current_user

router = APIRouter(prefix="/api/v1/users", tags=["Users"])
logger = logging.getLogger("awaazify.users")

SIGNUP_BONUS_PKR = 50


def _bonus_tx_id(user_id: str) -> str:
    # Deterministic UUID5 -> valid UUID for the payment_transactions PK
    # (which is UUID type), still exactly-once: a concurrent duplicate
    # insert conflicts and raises.
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"signup-bonus-{user_id}"))


@router.post("/me/sync")
def sync_current_user(current_user: dict = Depends(get_current_user)):
    """
    Server-side user sync + signup bonus (replaces the old client-side bonus
    insert). Idempotent: creates the public.users row if missing and grants
    the Rs. 50 signup bonus EXACTLY ONCE.

    Response: {"bonus_granted": bool, "balance": int}
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

    # 2. Exactly-once bonus guard: deterministic transaction id. If it already
    # exists (or a concurrent call wins the insert race), no second grant.
    tx_id = _bonus_tx_id(user_id)
    existing = db.select("payment_transactions", {"id": f"eq.{tx_id}"})
    if existing:
        return {"bonus_granted": False, "balance": user.get("balance_pkr", 0)}

    try:
        db.insert_strict("payment_transactions", {
            "id": tx_id,
            "user_id": user_id,
            "user_email": email or "studio@awaazify.com",
            # NOTE: "system" violates the payment_transactions_provider_check
            # constraint (only easypaisa/jazzcash allowed). Using easypaisa as
            # the provider for the system-granted signup bonus.
            "provider": "easypaisa",
            "package_id": "signup-bonus",
            "amount_pkr": SIGNUP_BONUS_PKR,
            "amount_usd": 0,
            "transaction_id": tx_id,
            "screenshot_url": None,
            "status": "Approved",
        })
    except Exception as exc:
        # Lost the race (or any insert failure): fail closed, never double-grant.
        logger.info(f"Signup bonus already granted or insert failed for user={user_id}: {exc}")
        fresh = db.select("users", {"id": f"eq.{user_id}"})
        return {"bonus_granted": False, "balance": (fresh[0].get("balance_pkr", 0) if fresh else 0)}

    # 3. Winner credits the bonus. If THIS update fails after the guard row was
    # written, we fail closed (no retry double-grant); the loud log lets it be
    # fixed manually.
    balance_pkr = user.get("balance_pkr", 0)
    credited = db.update_where(
        "users",
        {"id": f"eq.{user_id}"},
        {"balance_pkr": balance_pkr + SIGNUP_BONUS_PKR},
    )
    if not credited:
        logger.error(f"SIGNUP BONUS GUARD WROTE BUT CREDIT FAILED for user={user_id}; manual fix needed.")
        return {"bonus_granted": False, "balance": balance_pkr}

    new_balance = balance_pkr + SIGNUP_BONUS_PKR
    logger.info(f"Granted Rs. {SIGNUP_BONUS_PKR} signup bonus: user={user_id}")
    return {"bonus_granted": True, "balance": new_balance}
