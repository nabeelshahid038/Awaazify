import subprocess
import shutil
import logging
from pathlib import Path
import numpy as np
from scipy.io import wavfile

logger = logging.getLogger("awaazify.audio_mixer")

def mix_converted_vocals_and_beat(
    converted_vocals_wav: Path,
    no_vocals_wav: Path,
    output_audio_path: Path
) -> Path:
    """
    Normalizes converted vocals (+1.5dB) and mixes onto background music (-1.0dB headroom).
    Exports high quality 320kbps MP3 (or WAV if ffmpeg is not present).
    """
    output_audio_path.parent.mkdir(parents=True, exist_ok=True)
    
    sr_v, vocals_data = wavfile.read(str(converted_vocals_wav))
    sr_b, beat_data = wavfile.read(str(no_vocals_wav))
    
    # Ensure same sample rate
    if sr_v != sr_b:
        logger.warning(f"Sample rate mismatch: vocals {sr_v}Hz vs beat {sr_b}Hz. Aligning to {sr_b}Hz.")
        v_indices = np.linspace(0, len(vocals_data) - 1, int(len(vocals_data) * (sr_b / sr_v)))
        vocals_data = np.interp(v_indices, np.arange(len(vocals_data)), vocals_data.astype(np.float32)).astype(np.int16)
        sr_v = sr_b

    # Convert to float arrays
    v_float = vocals_data.astype(np.float32)
    b_float = beat_data.astype(np.float32)
    
    # Handle stereo vs mono
    if b_float.ndim == 2 and v_float.ndim == 1:
        v_float = np.column_stack([v_float, v_float])
    elif b_float.ndim == 1 and v_float.ndim == 2:
        b_float = np.column_stack([b_float, b_float])
        
    # Match length
    min_len = min(len(v_float), len(b_float))
    v_float = v_float[:min_len]
    b_float = b_float[:min_len]
    
    # Gain adjustments: vocals +1.5dB (1.188x), beat -1.0dB headroom (0.891x)
    v_gain = 10.0 ** (1.5 / 20.0)
    b_gain = 10.0 ** (-1.0 / 20.0)
    
    mixed = (v_float * v_gain) + (b_float * b_gain)
    
    # Peak limiting / normalization
    peak = np.max(np.abs(mixed))
    if peak > 32767:
        mixed = mixed / peak * 32760
        
    mixed_int16 = mixed.astype(np.int16)
    
    # Write intermediate wav
    temp_mixed_wav = output_audio_path.with_suffix(".temp.wav")
    wavfile.write(str(temp_mixed_wav), sr_b, mixed_int16)
    
    # Try converting to 320kbps MP3 via ffmpeg
    ffmpeg_bin = shutil.which("ffmpeg")
    if ffmpeg_bin:
        try:
            mp3_path = output_audio_path.with_suffix(".mp3")
            cmd = [
                ffmpeg_bin, "-y",
                "-i", str(temp_mixed_wav),
                "-b:a", "320k",
                str(mp3_path)
            ]
            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=60)
            if res.returncode == 0 and mp3_path.exists():
                temp_mixed_wav.unlink(missing_ok=True)
                return mp3_path
        except Exception as e:
            logger.warning(f"ffmpeg mp3 conversion failed: {e}")

    # Fallback: return WAV file if ffmpeg is unavailable
    final_wav_path = output_audio_path.with_suffix(".wav")
    if temp_mixed_wav.exists():
        temp_mixed_wav.rename(final_wav_path)
    return final_wav_path
