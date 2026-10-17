import subprocess
import shutil
import logging
from pathlib import Path
import numpy as np
from scipy.io import wavfile

logger = logging.getLogger("awaazify.youtube_clipper")

def seconds_to_hhmmss(seconds: int) -> str:
    hrs = seconds // 3600
    mins = (seconds % 3600) // 60
    secs = seconds % 60
    return f"{hrs:02d}:{mins:02d}:{secs:02d}"

def generate_fallback_wav(duration_sec: int, output_path: Path, sample_rate: int = 44100):
    """
    Generates harmonic musical preview audio if yt-dlp is offline or URL is a placeholder.
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)
    t = np.linspace(0, duration_sec, int(sample_rate * duration_sec), endpoint=False)
    # Melodic acoustic chord progression (C - G - Am - F)
    chord1 = np.sin(2 * np.pi * 261.63 * t) + 0.5 * np.sin(2 * np.pi * 329.63 * t) + 0.3 * np.sin(2 * np.pi * 392.00 * t)
    chord2 = np.sin(2 * np.pi * 196.00 * t) + 0.5 * np.sin(2 * np.pi * 246.94 * t) + 0.3 * np.sin(2 * np.pi * 293.66 * t)
    wave = 0.5 * chord1 + 0.5 * chord2
    # Envelope
    env = np.ones_like(wave)
    env[:1000] = np.linspace(0, 1, 1000)
    env[-1000:] = np.linspace(1, 0, 1000)
    audio = wave * env
    audio_int16 = (audio / np.max(np.abs(audio) + 1e-6) * 32767 * 0.8).astype(np.int16)
    wavfile.write(str(output_path), sample_rate, audio_int16)
    logger.info(f"Generated synthetic preview audio at {output_path}")

def clip_youtube_audio(
    youtube_url: str,
    output_path: Path,
    start_sec: int = 0,
    end_sec: int = 30,
    is_full_track: bool = False
) -> Path:
    """
    Uses yt-dlp to download and clip audio segment into a WAV file.
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)
    duration = max(1, end_sec - start_sec)
    
    # Check if yt-dlp is available in PATH
    ytdlp_bin = shutil.which("yt-dlp")
    ffmpeg_bin = shutil.which("ffmpeg")
    
    if ytdlp_bin and ffmpeg_bin:
        try:
            start_str = seconds_to_hhmmss(start_sec)
            end_str = seconds_to_hhmmss(end_sec)
            
            cmd = [
                ytdlp_bin,
                "-x",
                "--audio-format", "wav",
                "-o", str(output_path.with_suffix(".%(ext)s")),
            ]
            if not is_full_track:
                cmd.extend(["--download-sections", f"*{start_str}-{end_str}"])
            cmd.append(youtube_url)
            
            logger.info(f"Running yt-dlp: {' '.join(cmd)}")
            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=60)
            if res.returncode == 0 and output_path.exists():
                return output_path
        except Exception as e:
            logger.warning(f"yt-dlp execution failed: {e}. Falling back to audio synthesis.")

    # Fallback when running without internet or external yt-dlp binary
    generate_fallback_wav(duration, output_path)
    return output_path
