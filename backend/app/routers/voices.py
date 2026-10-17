import uuid
import logging
from pathlib import Path
from fastapi import APIRouter, HTTPException, status
import httpx
from scipy.io import wavfile
from app.models.schemas import VoiceTrainPayload, VoiceTrainResponse
from app.database import db
from app.config import (
    TEMP_AUDIO_DIR,
    GPU_WORKER_URL,
    GPU_WORKER_API_KEY,
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
)
from app.services.voice_cleaner import clean_and_prepare_voice_dataset
from app.services.youtube_clipper import generate_fallback_wav

router = APIRouter(prefix="/api/v1/voices", tags=["Voice Training"])
logger = logging.getLogger("awaazify.voices")

DEFAULT_STUDIO_USER_ID = "4d8ef3dc-12d1-4b97-bea6-6858756bfbdc"

def resolve_uuid(val: str, default: str) -> str:
    try:
        return str(uuid.UUID(val))
    except (ValueError, AttributeError, TypeError):
        return default

@router.post("/train", response_model=VoiceTrainResponse)
async def train_custom_voice(payload: VoiceTrainPayload):
    job_id = str(uuid.uuid4())
    user_id = resolve_uuid(payload.userId, DEFAULT_STUDIO_USER_ID)
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

    cleaned_url = None

    # 2. Offload Audio Cleaning to GPU Worker if configured
    if GPU_WORKER_URL:
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
            "supabase_key": SUPABASE_SERVICE_ROLE_KEY,
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
def list_training_jobs(userId: str = ""):
    resolved = resolve_uuid(userId, DEFAULT_STUDIO_USER_ID) if userId else ""
    params = {"user_id": f"eq.{resolved}"} if resolved else {}
    return db.select("voice_training_jobs", params)
