import subprocess
import shutil
import logging
from pathlib import Path
from typing import Tuple
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

logger = logging.getLogger("awaazify.stem_separator")

def bandpass_filter(data: np.ndarray, lowcut: float, highcut: float, fs: int, order: int = 5):
    sos = butter(order, [lowcut, highcut], btype='bandpass', fs=fs, output='sos')
    return sosfilt(sos, data)

def fallback_vocal_instrumental_split(input_wav: Path, output_dir: Path) -> Tuple[Path, Path]:
    """
    DSP-based fallback splitter if Demucs GPU/CPU binary is unavailable.
    Isolates vocal frequency band (300Hz - 3400Hz) and background instrumental.
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    vocals_path = output_dir / "vocals.wav"
    no_vocals_path = output_dir / "no_vocals.wav"
    
    sr, data = wavfile.read(str(input_wav))
    if data.ndim == 2:
        # Stereo: mid-side vocal extraction
        left = data[:, 0].astype(np.float32)
        right = data[:, 1].astype(np.float32)
        mid = (left + right) / 2.0
        side = (left - right) / 2.0
        
        # Vocals are predominantly in the center and human voice band
        vocal_mid = bandpass_filter(mid, 300, 3400, sr)
        vocals = (vocal_mid / (np.max(np.abs(vocal_mid)) + 1e-6) * 32767 * 0.9).astype(np.int16)
        
        # Instrumental is side + out-of-band mid
        no_vocals_left = left - vocal_mid * 0.7
        no_vocals_right = right - vocal_mid * 0.7
        no_vocals = np.column_stack([no_vocals_left, no_vocals_right])
        no_vocals = (no_vocals / (np.max(np.abs(no_vocals)) + 1e-6) * 32767 * 0.8).astype(np.int16)
    else:
        # Mono
        data_f = data.astype(np.float32)
        vocal_f = bandpass_filter(data_f, 300, 3400, sr)
        vocals = (vocal_f / (np.max(np.abs(vocal_f)) + 1e-6) * 32767 * 0.9).astype(np.int16)
        no_vocal_f = data_f - vocal_f * 0.7
        no_vocals = (no_vocal_f / (np.max(np.abs(no_vocal_f)) + 1e-6) * 32767 * 0.8).astype(np.int16)

    wavfile.write(str(vocals_path), sr, vocals)
    wavfile.write(str(no_vocals_path), sr, no_vocals)
    logger.info(f"Fallback stem separation completed: {vocals_path}, {no_vocals_path}")
    return vocals_path, no_vocals_path

def separate_stems(input_wav: Path, job_work_dir: Path) -> Tuple[Path, Path]:
    """
    Separates vocals and background music using Demucs (htdemucs).
    Returns (vocals_wav_path, no_vocals_wav_path).
    """
    demucs_bin = shutil.which("demucs")
    demucs_out = job_work_dir / "separated"
    
    if demucs_bin:
        try:
            cmd = [
                demucs_bin,
                "-n", "htdemucs",
                "--two-stems=vocals",
                "-o", str(demucs_out),
                str(input_wav)
            ]
            logger.info(f"Executing Demucs: {' '.join(cmd)}")
            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=300)
            
            # Demucs outputs to: {demucs_out}/htdemucs/{input_stem}/vocals.wav and no_vocals.wav
            model_subfolder = demucs_out / "htdemucs" / input_wav.stem
            vocals = model_subfolder / "vocals.wav"
            no_vocals = model_subfolder / "no_vocals.wav"
            
            if res.returncode == 0 and vocals.exists() and no_vocals.exists():
                logger.info(f"Demucs separation succeeded for {input_wav.name}")
                return vocals, no_vocals
        except Exception as e:
            logger.warning(f"Demucs execution failed or timed out: {e}. Using fallback DSP splitter.")

    return fallback_vocal_instrumental_split(input_wav, job_work_dir)
