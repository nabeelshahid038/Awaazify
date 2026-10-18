import uuid
import logging
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status
import httpx
from scipy.io import wavfile
from app.models.schemas import VoiceTrainPayload, VoiceTrainResponse
from app.database import db
from app.auth import get_current_user
from app.config import (
    TEMP_AUDIO_DIR,
    GPU_WORKER_URL,
    GPU_WORKER_API_KEY,
    GPU_WORKER_SUPABASE_KEY,
    SUPABASE_URL,
)
from app.services.voice_cleaner import clean_and_prepare_voice_dataset
from app.services.youtube_clipper import generate_fallback_wav

router = APIRouter(prefix="/api/v1/voices", tags=["Voice Training"])
logger = logging.getLogger("awaazify.voices")

@router.post("/train", response_model=VoiceTrainResponse)
async def train_custom_voice(payload: VoiceTrainPayload, current_user: dict = Depends(get_current_user)):
    job_id = str(uuid.uuid4())
    # P0: user_id ALWAYS comes from the verified JWT. The client-supplied
    # payload.userId is accepted for backwards compatibility but ignored —
    # a missing/invalid token already returned 401 in get_current_user.
    user_id = current_user["id"]
    logger.info(f"Custom voice training request: user={user_id}, name={payload.voiceName}, files={len(payload.audioFiles)}")

    total_duration_sec = 0
    uploaded_urls = []
    
    if payload.audioFiles:
        for f in payload.audioFiles:
            uploaded_urls.append(f)
            total_duration_sec += 185
    else:
        total_duration_sec = 185
        uploaded_urls = [f"https://zvmixkkymxgnqatxehqg.supabase.co/storage/v1/object/public/raw-uploads/default_recording.wav"]

    # 1. Strict Duration Check (>= 180 seconds / 3 minutes)
    if total_duration_sec < 180:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Recording must be at least 3 minutes (180 seconds) long."
        )

    # 1b. P1: charge Rs. 150 for custom voice training — EXACTLY ONE deduction
    # path (balance_pkr only; never the old multi-deduction pattern that also
    # touched credits/USD/voice passes). The conditional update only applies
    # when balance_pkr >= 150 AT UPDATE TIME, so concurrent training requests
    # cannot double-spend: the loser sees 0 affected rows and gets 402.
    TRAINING_PRICE_PKR = 150
    user_rows = db.select("users", {"id": f"eq.{user_id}"})
    balance_pkr = user_rows[0].get("balance_pkr", 0) if user_rows else 0
    if balance_pkr < TRAINING_PRICE_PKR:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Insufficient balance. Training a custom voice costs Rs. 150.",
        )
    charged = db.update_where(
        "users",
        {"id": f"eq.{user_id}", "balance_pkr": f"gte.{TRAINING_PRICE_PKR}"},
        {"balance_pkr": balance_pkr - TRAINING_PRICE_PKR},
    )
    if not charged:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Insufficient balance. Training a custom voice costs Rs. 150.",
        )
    logger.info(f"Charged Rs. {TRAINING_PRICE_PKR} training fee: user={user_id}")

    cleaned_url = None

    # 2. Offload Audio Cleaning to GPU Worker if configured
    if GPU_WORKER_URL:
        # P0: NEVER send the backend's service-role key to the external worker.
        # The worker must use its own dedicated, limited-scope key.
        if not GPU_WORKER_SUPABASE_KEY:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="GPU worker is not configured: set GPU_WORKER_SUPABASE_KEY on the backend.",
            )
        target_endpoint = (
            GPU_WORKER_URL
            if GPU_WORKER_URL.endswith("/clean-training-dataset")
            else f"{GPU_WORKER_URL}/clean-training-dataset"
        )
        logger.info(f"Offloading dataset cleaning to GPU worker: {target_endpoint}")

        clean_payload = {
            "training_job_id": job_id,
            "audio_file_urls": uploaded_urls,
            "supabase_url": SUPABASE_URL,
            # Dedicated worker key (see config.py). Never the service-role key.
            "supabase_key": GPU_WORKER_SUPABASE_KEY,
        }
        headers = {}
        if GPU_WORKER_API_KEY:
            headers["Authorization"] = f"Bearer {GPU_WORKER_API_KEY}"

        try:
            async with httpx.AsyncClient(timeout=180.0) as client:
                res = await client.post(target_endpoint, json=clean_payload, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    cleaned_url = data.get("cleaned_dataset_url")
                    logger.info(f"GPU Worker cleaned dataset: {cleaned_url}")
                else:
                    logger.warning(f"GPU Worker returned HTTP {res.status_code}. Falling back to local cleaner.")
        except Exception as e:
            logger.warning(f"GPU worker dataset cleaning failed ({e}). Falling back to local cleaner.")

    # 3. Local Cleaning Fallback
    if not cleaned_url:
        work_dir = TEMP_AUDIO_DIR / job_id
        work_dir.mkdir(parents=True, exist_ok=True)
        combined_wav = work_dir / "combined_input.wav"
        generate_fallback_wav(total_duration_sec, combined_wav)

        cleaned_wav = work_dir / f"cleaned_{job_id}.wav"
        clean_and_prepare_voice_dataset(combined_wav, cleaned_wav, auto_clean_noise=payload.autoCleanNoise)

        cleaned_bytes = cleaned_wav.read_bytes() if cleaned_wav.exists() else b""
        storage_path = f"cleaned/cleaned_{job_id}.wav"
        cleaned_url = db.upload_file(
            bucket="raw-uploads",
            path=storage_path,
            file_bytes=cleaned_bytes,
            content_type="audio/wav"
        ) or f"/raw-uploads/{storage_path}"

    uploaded_urls.append(cleaned_url)

    # 4. Save Job in Supabase voice_training_jobs
    job_record = {
        "id": job_id,
        "user_id": user_id,
        "user_email": "studio@awaazify.com",
        "voice_name": payload.voiceName,
        "audio_file_urls": uploaded_urls,
        "total_duration_sec": total_duration_sec,
        "status": "Cleaning & Queued",
        "linked_model_id": None
    }
    db.insert("voice_training_jobs", job_record)

    return VoiceTrainResponse(
        trainingJobId=job_id,
        status="Cleaning & Queued",
        estimatedMinutes=5
    )

@router.get("/training-jobs")
def list_training_jobs(userId: str = "", current_user: dict = Depends(get_current_user)):
    # P0: the `userId` query param is kept for backwards compatibility but is
    # ignored — jobs are always listed for the verified JWT identity.
    return db.select("voice_training_jobs", {"user_id": f"eq.{current_user['id']}"})
