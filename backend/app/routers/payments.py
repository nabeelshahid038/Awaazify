import uuid
import logging
from fastapi import APIRouter, Depends
from app.models.schemas import LocalPaymentPayload, LocalPaymentResponse
from app.database import db
from app.auth import get_current_user

router = APIRouter(prefix="/api/v1/payments", tags=["Payments"])
logger = logging.getLogger("awaazify.payments")

@router.post("/local-verify", response_model=LocalPaymentResponse)
def submit_local_payment(payload: LocalPaymentPayload, current_user: dict = Depends(get_current_user)):
    # P0: user_id ALWAYS comes from the verified JWT. The client-supplied
    # payload.userId is accepted for backwards compatibility but ignored —
    # a missing/invalid token already returned 401 in get_current_user.
    user_id = current_user["id"]

    # Check for existing TID
    existing = db.select("payment_transactions", {"transaction_id": f"eq.{payload.transactionId}"})
    if existing:
        logger.warning(f"Transaction ID {payload.transactionId} already exists in database.")
        return LocalPaymentResponse(
            paymentId=existing[0]["id"],
            status=existing[0].get("status", "Pending")
        )

    payment_id = str(uuid.uuid4())
    logger.info(f"Submitting local payment: id={payment_id}, user={user_id}, provider={payload.provider}, TID={payload.transactionId}")

    tx_record = {
        "id": payment_id,
        "user_id": user_id,
        "user_email": current_user.get("email") or "studio@awaazify.com",
        "provider": payload.provider,
        "package_id": payload.packageId,
        "amount_pkr": payload.amountPkr,
        "amount_usd": 0.99 if payload.packageId == "song-50" else 2.99,
        "transaction_id": payload.transactionId,
        "screenshot_url": payload.screenshotUrl,
        "status": "Pending",
    }
    db.insert("payment_transactions", tx_record)

    return LocalPaymentResponse(
        paymentId=payment_id,
        status="Pending"
    )

@router.get("")
def list_payments(userId: str = "", current_user: dict = Depends(get_current_user)):
    # P0: the `userId` query param is kept for backwards compatibility but is
    # ignored — payments are always listed for the verified JWT identity.
    return db.select("payment_transactions", {"user_id": f"eq.{current_user['id']}"})
