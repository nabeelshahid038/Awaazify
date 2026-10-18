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


@router.delete("/models/{model_id}")
def delete_admin_voice_model(model_id: str, admin: dict = Depends(require_admin)):
    """Permanently delete a voice model from the catalog (admin only)."""
    logger.info(f"Admin {admin['id']} deleting voice model: id={model_id}")
    deleted = db.delete("voice_models", "id", model_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Voice model not found.",
        )
    return {"modelId": model_id, "status": "success", "message": "Voice model deleted."}


@router.patch("/models/{model_id}")
def update_admin_voice_model(
    model_id: str, payload: dict, admin: dict = Depends(require_admin)
):
    """Update a voice model's status (Active / Coming Soon / Hidden)."""
    new_status = (payload or {}).get("status")
    if new_status not in ("Active", "Coming Soon", "Hidden"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="status must be one of: Active, Coming Soon, Hidden.",
        )
    existing = db.select("voice_models", {"id": f"eq.{model_id}"})
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Voice model not found.",
        )
    logger.info(f"Admin {admin['id']} setting voice model {model_id} status={new_status}")
    db.update("voice_models", "id", model_id, {"status": new_status})
    return {"modelId": model_id, "status": new_status}


@router.post("/payments/{paymentId}/approve")
def approve_payment(paymentId: str, admin: dict = Depends(require_admin)):
    logger.info(f"Admin {admin['id']} approving payment {paymentId}")

    # P1 race-safe: ONE conditional DB update — the status flips to Approved
    # only if it is still Pending AT UPDATE TIME. Concurrent double-clicks /
    # double-approves: exactly one wins; the loser sees 0 affected rows.
    updated = db.update_where(
        "payment_transactions",
        {"id": f"eq.{paymentId}", "status": "eq.Pending"},
        {"status": "Approved"},
    )
    if not updated:
        tx_rows = db.select("payment_transactions", {"id": f"eq.{paymentId}"})
        if not tx_rows:
            raise HTTPException(status_code=404, detail="Payment transaction not found")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Payment is already '{tx_rows[0].get('status')}'; already processed.",
        )

    tx = updated[0]
    user_id = tx.get("user_id")
    package_id = tx.get("package_id")

    # Credit user balance & song credits in Supabase (winner only — runs once)
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
    # P1 race-safe: same conditional-update pattern as approve.
    updated = db.update_where(
        "payment_transactions",
        {"id": f"eq.{paymentId}", "status": "eq.Pending"},
        {"status": "Rejected"},
    )
    if not updated:
        tx_rows = db.select("payment_transactions", {"id": f"eq.{paymentId}"})
        if not tx_rows:
            raise HTTPException(status_code=404, detail="Payment transaction not found")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Payment is already '{tx_rows[0].get('status')}'; already processed.",
        )
    return {"status": "Rejected", "paymentId": paymentId}


@router.delete("/payments/{paymentId}")
def delete_payment(paymentId: str, admin: dict = Depends(require_admin)):
    """Permanently delete a payment transaction record (admin only). Used to
    clean up test/dummy entries."""
    logger.info(f"Admin {admin['id']} deleting payment {paymentId}")
    deleted = db.delete("payment_transactions", "id", paymentId)
    if not deleted:
        raise HTTPException(status_code=404, detail="Payment transaction not found")
    return {"status": "success", "paymentId": paymentId}


@router.delete("/training-jobs/{jobId}")
def delete_training_job(jobId: str, admin: dict = Depends(require_admin)):
    """Permanently delete a voice training job record (admin only). Used to
    clean up test/dummy entries."""
    logger.info(f"Admin {admin['id']} deleting training job {jobId}")
    deleted = db.delete("voice_training_jobs", "id", jobId)
    if not deleted:
        raise HTTPException(status_code=404, detail="Voice training job not found")
    return {"status": "success", "jobId": jobId}

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
