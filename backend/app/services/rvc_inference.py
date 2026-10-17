import subprocess
import shutil
import logging
from pathlib import Path
from typing import Optional
import numpy as np
from scipy.io import wavfile
from scipy.ndimage import zoom
from app.config import RVC_CLI_PATH

logger = logging.getLogger("awaazify.rvc_inference")

def dsp_pitch_and_timbre_shift(
    input_wav: Path,
    output_wav: Path,
    pitch_semitones: int = 0,
    clarity_boost: bool = False
):
    """
    DSP-based pitch shifting and timbre modulation fallback.
    """
    sr, data = wavfile.read(str(input_wav))
    if data.ndim == 2:
        signal = data[:, 0].astype(np.float32)
    else:
        signal = data.astype(np.float32)
        
    factor = 2.0 ** (pitch_semitones / 12.0)
    
    if abs(factor - 1.0) > 0.01:
        # Resample to shift pitch
        new_len = int(len(signal) / factor)
        indices = np.linspace(0, len(signal) - 1, new_len)
        shifted = np.interp(indices, np.arange(len(signal)), signal)
        # Stretch / compress time back to original length
        time_indices = np.linspace(0, len(shifted) - 1, len(signal))
        converted = np.interp(time_indices, np.arange(len(shifted)), shifted)
    else:
        converted = signal.copy()
        
    if clarity_boost:
        # High-frequency harmonic enhancement
        t = np.arange(len(converted))
        exciter = np.sin(converted * 0.001) * 300.0
        converted = converted + exciter
        
    # Normalize
    max_val = np.max(np.abs(converted)) + 1e-6
    out_audio = (converted / max_val * 32767 * 0.95).astype(np.int16)
    wavfile.write(str(output_wav), sr, out_audio)
    logger.info(f"DSP converted vocals generated at {output_wav}")

def run_rvc_conversion(
    vocals_wav: Path,
    output_wav: Path,
    pth_model_path: Optional[Path],
    index_model_path: Optional[Path] = None,
    pitch_shift: int = 0,
    clarity_boost: bool = False,
    f0_method: str = "rmvpe"
) -> Path:
    """
    Executes RVC v2 / Applio voice conversion engine.
    """
    index_rate = 0.85 if clarity_boost else 0.75
    
    # Check if Applio or RVC CLI is available
    cli_bin = RVC_CLI_PATH or shutil.which("rvc") or shutil.which("applio")
    
    if cli_bin and pth_model_path and pth_model_path.exists():
        try:
            cmd = [
                cli_bin,
                "infer",
                "--input_path", str(vocals_wav),
                "--output_path", str(output_wav),
                "--model_path", str(pth_model_path),
                "--f0_method", f0_method,
                "--f0_up_key", str(pitch_shift),
                "--index_rate", str(index_rate)
            ]
            if index_model_path and index_model_path.exists():
                cmd.extend(["--index_path", str(index_model_path)])
                
            logger.info(f"Running RVC CLI: {' '.join(cmd)}")
            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=240)
            if res.returncode == 0 and output_wav.exists() and output_wav.stat().st_size > 0:
                logger.info(f"RVC conversion completed successfully: {output_wav}")
                return output_wav
        except Exception as e:
            logger.warning(f"RVC CLI execution failed: {e}. Falling back to DSP engine.")

    # Fallback to DSP processing
    dsp_pitch_and_timbre_shift(vocals_wav, output_wav, pitch_semitones=pitch_shift, clarity_boost=clarity_boost)
    return output_wav
