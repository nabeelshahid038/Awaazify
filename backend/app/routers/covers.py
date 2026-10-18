import uuid
import logging
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status
import httpx
from app.models.schemas import CoverGeneratePayload, CoverGenerateResponse
from app.database import db
from app.auth import get_current_user
from app.config import (
    TEMP_AUDIO_DIR,
    GPU_WORKER_URL,
    GPU_WORKER_API_KEY,
    GPU_WORKER_SUPABASE_KEY,
    SUPABASE_URL,
)
from app.services.drive_downloader import ensure_model_files
from app.services.youtube_clipper import clip_youtube_audio, generate_fallback_wav
from app.services.stem_separator import separate_stems
from app.services.rvc_inference import run_rvc_conversion
from app.services.audio_mixer import mix_converted_vocals_and_beat

router = APIRouter(prefix="/api/v1/covers", tags=["Song Covers"])
logger = logging.getLogger("awaazify.covers")

DEFAULT_BABAR_MODEL_ID = "e81d4fae-7dec-11d0-a765-00a0c91e6bf1"

def resolve_uuid(val: str, default: str) -> str:
    try:
        return str(uuid.UUID(val))
    except (ValueError, AttributeError, TypeError):
        return default

@router.post("/generate", response_model=CoverGenerateResponse)
async def generate_song_cover(payload: CoverGeneratePayload, current_user: dict = Depends(get_current_user)):
    job_id = str(uuid.uuid4())
    # P0: user_id ALWAYS comes from the verified JWT. The client-supplied
    # payload.userId is accepted for backwards compatibility but ignored —
    # a missing/invalid token already returned 401 in get_current_user.
    user_id = current_user["id"]
    voice_model_id = resolve_uuid(payload.voiceModelId, DEFAULT_BABAR_MODEL_ID)
    
    logger.info(f"Processing song cover request: job={job_id}, user={user_id}, model={voice_model_id}")
    
    # 1. Quota & Retry Verification in Supabase
    user_rows = db.select("users", {"id": f"eq.{user_id}"})
    user = user_rows[0] if user_rows else None
    
    if payload.isRetry:
        if payload.parentJobId:
            parent_id = resolve_uuid(payload.parentJobId, "")
            if parent_id:
                parent_rows = db.select("generated_songs", {"id": f"eq.{parent_id}"})
                if parent_rows and parent_rows[0].get("has_used_free_retry"):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Free retry has already been used for this song."
                    )
                db.update("generated_songs", "id", parent_id, {"has_used_free_retry": True})
    elif payload.isTrialPreview:
        # Enforce maximum 30 seconds
        start = payload.trimStart or 0
        end = payload.trimEnd or 30
        if (end - start) > 30:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Free trial preview is strictly limited to 30 seconds."
            )
        if user:
            db.update("users", "id", user_id, {"has_free_trial": False})
    else:
        # Paid Full Song: check credits or balance
        if user:
            credits = user.get("song_credits", 0)
            balance_pkr = user.get("balance_pkr", 0)
            balance_usd = user.get("balance_usd", 0.0)
            if credits < 1 and balance_pkr < 50 and balance_usd < 0.99:
                raise HTTPException(
                    status_code=status.HTTP_402_PAYMENT_REQUIRED,
                    detail="Insufficient credits or balance. Please add Rs. 50 or $0.99 to continue."
                )
            if credits >= 1:
                db.update("users", "id", user_id, {"song_credits": credits - 1})
            elif balance_pkr >= 50:
                db.update("users", "id", user_id, {"balance_pkr": balance_pkr - 50})
            elif balance_usd >= 0.99:
                db.update("users", "id", user_id, {"balance_usd": round(balance_usd - 0.99, 2)})

    # 2. Fetch Voice Model Metadata & Google Drive Links
    model_rows = db.select("voice_models", {"id": f"eq.{voice_model_id}"})
    model = model_rows[0] if model_rows else None
    model_name = model.get("name", "Babar Azam") if model else "Babar Azam"
    model_pth_url = model.get("model_file_url") if model else None
    model_idx_url = model.get("index_file_url") if model else None

    output_audio_url = None
    start_sec = payload.trimStart or 0
    end_sec = payload.trimEnd or 30
    duration_sec = max(1, end_sec - start_sec)

    # 3. Offload to External GPU Worker (Modal.com or Colab Cloudflare Tunnel) if configured
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
            if GPU_WORKER_URL.endswith("/process-cover")
            else f"{GPU_WORKER_URL}/process-cover"
        )
        logger.info(f"Offloading Demucs + RVC v2 inference to GPU worker: {target_endpoint}")
        
        gpu_payload = {
            "job_id": job_id,
            "input_type": payload.inputType,
            "file_url": payload.fileUrl,
            "youtube_url": payload.youtubeUrl,
            "trim_start": start_sec,
            "trim_end": end_sec,
            "pth_drive_url": model_pth_url,
            "index_drive_url": model_idx_url,
            "model_name": model_name,
            "pitch_shift": payload.pitchShift,
            "clarity_boost": bool(payload.clarityBoost),
            "supabase_url": SUPABASE_URL,
            # Dedicated worker key (see config.py). Never the service-role key.
            "supabase_key": GPU_WORKER_SUPABASE_KEY,
        }
        headers = {}
        if GPU_WORKER_API_KEY:
            headers["Authorization"] = f"Bearer {GPU_WORKER_API_KEY}"

        try:
            async with httpx.AsyncClient(timeout=300.0) as client:
                res = await client.post(target_endpoint, json=gpu_payload, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    output_audio_url = data.get("output_audio_url")
                    logger.info(f"GPU Worker successfully returned output audio: {output_audio_url}")
                else:
                    logger.warning(f"GPU Worker returned HTTP {res.status_code}: {res.text}. Falling back to local pipeline.")
        except Exception as e:
            logger.warning(f"Failed contacting GPU worker ({e}). Falling back to local audio pipeline.")

    # 4. Local Audio Pipeline Fallback (DSP / CPU)
    if not output_audio_url:
        work_dir = TEMP_AUDIO_DIR / job_id
        work_dir.mkdir(parents=True, exist_ok=True)
        
        pth_path, index_path = ensure_model_files(model_name, model_pth_url, model_idx_url)
        source_wav = work_dir / "source.wav"

        if payload.inputType == "youtube" and payload.youtubeUrl:
            clip_youtube_audio(
                payload.youtubeUrl,
                source_wav,
                start_sec=start_sec,
                end_sec=end_sec,
                is_full_track=(not payload.isTrialPreview)
            )
        elif payload.inputType == "file" and payload.fileUrl:
            file_bytes = db.download_file("raw-uploads", payload.fileUrl)
            if file_bytes:
                source_wav.write_bytes(file_bytes)
            else:
                generate_fallback_wav(duration_sec, source_wav)
        else:
            generate_fallback_wav(duration_sec, source_wav)

        vocals_wav, no_vocals_wav = separate_stems(source_wav, work_dir)
        converted_vocals_wav = work_dir / "converted_vocals.wav"
        run_rvc_conversion(
            vocals_wav=vocals_wav,
            output_wav=converted_vocals_wav,
            pth_model_path=pth_path,
            index_model_path=index_path,
            pitch_shift=payload.pitchShift,
            clarity_boost=bool(payload.clarityBoost)
        )

        final_output_path = work_dir / "final_mix.mp3"
        mixed_file = mix_converted_vocals_and_beat(converted_vocals_wav, no_vocals_wav, final_output_path)

        storage_path = f"{user_id}/{job_id}{mixed_file.suffix}"
        output_audio_url = db.upload_file(
            bucket="final-songs",
            path=storage_path,
            file_bytes=mixed_file.read_bytes(),
            content_type="audio/mpeg" if mixed_file.suffix == ".mp3" else "audio/wav"
        ) or f"/songs/{job_id}{mixed_file.suffix}"

    # 5. Insert Record into Supabase generated_songs
    song_record = {
        "id": job_id,
        "user_id": user_id,
        "title": f"{model_name} Cover - {payload.inputType.capitalize()}",
        "source_type": payload.inputType,
        "source_label": payload.youtubeUrl or payload.fileUrl or "Studio Track",
        "voice_model_id": voice_model_id,
        "output_audio_url": output_audio_url,
        "duration_sec": duration_sec,
        "is_trial_preview": payload.isTrialPreview,
        "pitch_shift": payload.pitchShift,
        "clarity_boost": bool(payload.clarityBoost),
        "has_used_free_retry": payload.isRetry,
    }
    db.insert("generated_songs", song_record)

    return CoverGenerateResponse(
        jobId=job_id,
        status="completed",
        outputAudioUrl=output_audio_url,
        message="Song cover generated successfully!"
    )

@router.get("")
def list_songs(userId: str = "", current_user: dict = Depends(get_current_user)):
    # P0: the `userId` query param is kept for backwards compatibility but is
    # ignored — songs are always listed for the verified JWT identity.
    return db.select("generated_songs", {"user_id": f"eq.{current_user['id']}"})
