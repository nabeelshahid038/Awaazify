import logging
from pathlib import Path
import numpy as np
from scipy.io import wavfile

logger = logging.getLogger("awaazify.voice_cleaner")

def strip_silence_pauses(audio: np.ndarray, sr: int, min_silence_len_ms: int = 500, silence_thresh_db: float = -40.0) -> np.ndarray:
    """
    Strips silent pauses longer than min_silence_len_ms using RMS energy thresholding.
    """
    frame_len = int(sr * 0.02) # 20ms frames
    hop_len = int(sr * 0.01)   # 10ms hop
    
    num_frames = (len(audio) - frame_len) // hop_len
    if num_frames <= 0:
        return audio
        
    rms = np.array([
        np.sqrt(np.mean(audio[i * hop_len : i * hop_len + frame_len] ** 2) + 1e-9)
        for i in range(num_frames)
    ])
    
    max_rms = np.max(rms) + 1e-9
    db = 20 * np.log10(rms / max_rms)
    
    # Identify active frames
    is_speech = db > silence_thresh_db
    
    # Group frames into active speech segments
    keep_indices = []
    min_silence_frames = min_silence_len_ms // 10
    
    silence_count = 0
    for i, speech in enumerate(is_speech):
        if speech:
            keep_indices.extend(range(i * hop_len, min(len(audio), i * hop_len + hop_len)))
            silence_count = 0
        else:
            silence_count += 1
            # Keep up to 100ms of natural pause
            if silence_count <= 10:
                keep_indices.extend(range(i * hop_len, min(len(audio), i * hop_len + hop_len)))

    if not keep_indices:
        return audio
        
    keep_indices = sorted(list(set(keep_indices)))
    return audio[keep_indices]

def clean_and_prepare_voice_dataset(
    input_wav_path: Path,
    output_cleaned_path: Path,
    auto_clean_noise: bool = True
) -> Path:
    """
    Cleans audio file by reducing stationary noise and trimming silence gaps.
    """
    output_cleaned_path.parent.mkdir(parents=True, exist_ok=True)
    
    sr, data = wavfile.read(str(input_wav_path))
    if data.ndim == 2:
        audio = data[:, 0].astype(np.float32)
    else:
        audio = data.astype(np.float32)
        
    cleaned = audio.copy()
    
    if auto_clean_noise:
        # Try noisereduce if installed
        try:
            import noisereduce as nr
            logger.info("Applying noisereduce stationary noise suppression...")
            cleaned = nr.reduce_noise(y=cleaned, sr=sr, stationary=True)
        except Exception as e:
            logger.info(f"noisereduce not available or failed ({e}). Applying spectral gating.")
            # Simple high-pass rumble filter
            from scipy.signal import butter, sosfilt
            sos = butter(4, 80, btype='highpass', fs=sr, output='sos')
            cleaned = sosfilt(sos, cleaned)

    # Strip long silences > 500ms
    cleaned = strip_silence_pauses(cleaned, sr, min_silence_len_ms=500)
    
    # Normalize
    peak = np.max(np.abs(cleaned)) + 1e-6
    cleaned_int16 = (cleaned / peak * 32767 * 0.95).astype(np.int16)
    
    wavfile.write(str(output_cleaned_path), sr, cleaned_int16)
    logger.info(f"Cleaned dataset saved at {output_cleaned_path}")
    return output_cleaned_path
