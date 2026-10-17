import uuid
import logging
from fastapi import APIRouter
from app.models.schemas import LocalPaymentPayload, LocalPaymentResponse
from app.database import db

router = APIRouter(prefix="/api/v1/payments", tags=["Payments"])
logger = logging.getLogger("awaazify.payments")

DEFAULT_STUDIO_USER_ID = "4d8ef3dc-12d1-4b97-bea6-6858756bfbdc"

def resolve_uuid(val: str, default: str) -> str:
    try:
        return str(uuid.UUID(val))
    except (ValueError, AttributeError, TypeError):
        return default

@router.post("/local-verify", response_model=LocalPaymentResponse)
def submit_local_payment(payload: LocalPaymentPayload):
    user_id = resolve_uuid(payload.userId, DEFAULT_STUDIO_USER_ID)
    
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
        "user_email": "studio@awaazify.com",
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
def list_payments(userId: str = ""):
    resolved = resolve_uuid(userId, DEFAULT_STUDIO_USER_ID) if userId else ""
    params = {"user_id": f"eq.{resolved}"} if resolved else {}
    return db.select("payment_transactions", params)
