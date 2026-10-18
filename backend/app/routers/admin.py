import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from app.models.schemas import AdminModelPayload, PublishTrainedVoicePayload
from app.database import db
from app.auth import get_current_user, is_admin_email, require_admin

router = APIRouter(prefix="/api/v1/admin", tags=["Admin CMS"])
logger = logging.getLogger("awaazify.admin")

# NOTE: every route below requires a valid Supabase JWT (Google OAuth).
# Admin routes use require_admin, which allowlists ONE admin Gmail address
# (ADMIN_EMAIL server env var) against the verified JWT email — server-side.
# There is no client-side PIN/OTP trust — the AdminDashboard gate is UI-only.


@router.get("/me")
def admin_identity(current_user: dict = Depends(get_current_user)):
    """Who is calling, and are they the admin? Used by the admin panel gate."""
    email = current_user.get("email")
    return {"is_admin": is_admin_email(email), "email": email}


@router.post("/models")
def create_admin_voice_model(payload: AdminModelPayload, admin: dict = Depends(require_admin)):
    model_id = str(uuid.uuid4())
    logger.info(f"Admin {admin['id']} creating voice model: id={model_id}, name={payload.name}, category={payload.category}")

    record = {
        "id": model_id,
        "name": payload.name,
        "subtitle": payload.subtitle,
        "category": payload.category,
        "usage_count": 0,
        "avatar_config": payload.avatarConfig or {
            "silhouetteType": "vocalist",
            "gradientTheme": "emerald",
            "baseFreqHz": 215
        },
        "model_file_url": payload.modelFileUrl or "https://drive.google.com/file/d/placeholderModel/view",
        "index_file_url": payload.indexFileUrl or "https://drive.google.com/file/d/placeholderIndex/view",
        "default_pitch": payload.defaultPitch,
        "preview_audio_url": payload.previewAudioUrl or "https://zvmixkkymxgnqatxehqg.supabase.co/storage/v1/object/public/rvc-models/demo_audio.mp3",
        "status": payload.status,
        "is_custom": False,
        "owner_user_id": None,
    }
    db.insert("voice_models", record)

    return {
        "modelId": model_id,
        "status": "success",
        "message": f"Voice model '{payload.name}' published successfully."
    }

@router.get("/models")
def list_all_voice_models(admin: dict = Depends(require_admin)):
    return db.select("voice_models")

@router.post("/payments/{paymentId}/approve")
def approve_payment(paymentId: str, admin: dict = Depends(require_admin)):
    logger.info(f"Admin {admin['id']} approving payment {paymentId}")
    tx_rows = db.select("payment_transactions", {"id": f"eq.{paymentId}"})
    if not tx_rows:
        raise HTTPException(status_code=404, detail="Payment transaction not found")

    tx = tx_rows[0]

    # P0 idempotency: only credit the wallet when the payment is still Pending.
    # A double-approve must never double-credit.
    current_status = tx.get("status")
    if current_status == "Approved":
        logger.info(f"Payment {paymentId} is already Approved; skipping duplicate credit.")
        return {"status": "Approved", "paymentId": paymentId, "alreadyProcessed": True}
    if current_status not in ("Pending", None):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Payment is '{current_status}'; only Pending payments can be approved.",
        )

    user_id = tx.get("user_id")
    package_id = tx.get("package_id")

    # Update payment status
    db.update("payment_transactions", "id", paymentId, {"status": "Approved"})

    # Credit user balance & song credits in Supabase
    if user_id:
        user_rows = db.select("users", {"id": f"eq.{user_id}"})
        if user_rows:
            user = user_rows[0]
            current_pkr = user.get("balance_pkr", 0)
            current_credits = user.get("song_credits", 0)

            if package_id == "song-50":
                db.update("users", "id", user_id, {
                    "balance_pkr": current_pkr + 50,
                    "song_credits": current_credits + 1,
                })
            elif package_id == "voice-150":
                db.update("users", "id", user_id, {
                    "balance_pkr": current_pkr + 150,
                    "song_credits": current_credits + 1,
                })

    return {"status": "Approved", "paymentId": paymentId}

@router.post("/payments/{paymentId}/reject")
def reject_payment(paymentId: str, admin: dict = Depends(require_admin)):
    logger.info(f"Admin {admin['id']} rejecting payment {paymentId}")
    db.update("payment_transactions", "id", paymentId, {"status": "Rejected"})
    return {"status": "Rejected", "paymentId": paymentId}

@router.post("/training-jobs/{jobId}/publish")
def publish_trained_custom_voice(jobId: str, payload: PublishTrainedVoicePayload, admin: dict = Depends(require_admin)):
    logger.info(f"Admin {admin['id']} publishing trained custom voice for job {jobId}")
    job_rows = db.select("voice_training_jobs", {"id": f"eq.{jobId}"})
    if not job_rows:
        raise HTTPException(status_code=404, detail="Voice training job not found")

    job = job_rows[0]
    # user_id comes from the server-side job record, never from the client.
    user_id = job.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="Training job has no associated user.")
    voice_name = job.get("voice_name", "Personal Custom Voice")

    new_model_id = str(uuid.uuid4())

    # Create private voice model record
    model_record = {
        "id": new_model_id,
        "name": voice_name,
        "subtitle": "Personal Custom Voice · Studio Ready",
        "category": "Custom",
        "usage_count": 0,
        "avatar_config": {
            "silhouetteType": "custom",
            "gradientTheme": "emerald",
            "baseFreqHz": 210,
        },
        "model_file_url": payload.modelFileUrl,
        "index_file_url": payload.indexFileUrl,
        "preview_audio_url": payload.demoAudioUrl or "https://zvmixkkymxgnqatxehqg.supabase.co/storage/v1/object/public/rvc-models/custom_voice_demo.mp3",
        "default_pitch": 0,
        "status": "Active",
        "is_custom": True,
        "owner_user_id": user_id,
    }
    db.insert("voice_models", model_record)

    # Mark training job as Completed & link model
    db.update("voice_training_jobs", "id", jobId, {
        "status": "Active in Library",
        "linked_model_id": new_model_id,
    })

    return {
        "status": "Completed",
        "voiceModelId": new_model_id,
        "message": f"Custom voice '{voice_name}' is now active in the user's library."
    }
