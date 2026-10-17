import os
import re
import logging
from pathlib import Path
from typing import Optional, Tuple
import requests
from app.config import MODELS_CACHE_DIR

logger = logging.getLogger("awaazify.drive_downloader")

def extract_gdrive_file_id(url: str) -> Optional[str]:
    """
    Extracts Google Drive file ID from link using regex.
    """
    if not url:
        return None
    # Check for direct file id
    if re.match(r'^[-\w]{25,}$', url):
        return url
    
    # Check for standard drive URLs: /d/{id} or id={id}
    match = re.search(r'(?:/d/|id=|file/d/)([-\w]{25,})', url)
    if match:
        return match.group(1)
    
    # Generic match for 25+ alphanumeric with dash/underscore
    generic_match = re.search(r'[-\w]{25,}', url)
    return generic_match.group(0) if generic_match else None

def download_file_from_gdrive(file_id: str, destination: Path) -> bool:
    """
    Downloads file from Google Drive using gdown or requests fallback.
    """
    destination.parent.mkdir(parents=True, exist_ok=True)
    
    # Try using gdown first if available
    try:
        import gdown
        download_url = f"https://drive.google.com/uc?id={file_id}"
        logger.info(f"Downloading from Google Drive via gdown: {download_url} -> {destination}")
        output = gdown.download(download_url, str(destination), quiet=False)
        if output and destination.exists() and destination.stat().st_size > 0:
            return True
    except Exception as e:
        logger.warning(f"gdown download failed: {e}. Falling back to requests stream.")

    # Fallback to direct requests session with confirmation token
    try:
        session = requests.Session()
        url = "https://docs.google.com/uc?export=download"
        res = session.get(url, params={"id": file_id}, stream=True, timeout=30)
        
        # Check for virus scan warning / confirmation token
        token = None
        for k, v in res.cookies.items():
            if k.startswith("download_warning"):
                token = v
                break
        
        if token:
            res = session.get(url, params={"id": file_id, "confirm": token}, stream=True, timeout=30)
            
        res.raise_for_status()
        with open(destination, "wb") as f:
            for chunk in res.iter_content(chunk_size=32768):
                if chunk:
                    f.write(chunk)
                    
        return destination.exists() and destination.stat().st_size > 0
    except Exception as e:
        logger.error(f"Failed to download Google Drive file {file_id}: {e}")
        return False

def ensure_model_files(
    model_name: str,
    model_file_url: Optional[str] = None,
    index_file_url: Optional[str] = None
) -> Tuple[Optional[Path], Optional[Path]]:
    """
    Ensures .pth and .index files for a model are downloaded and cached locally.
    Returns: (local_pth_path, local_index_path)
    """
    clean_model_name = re.sub(r'[^\w\-]', '_', model_name.strip())
    model_dir = MODELS_CACHE_DIR / clean_model_name
    model_dir.mkdir(parents=True, exist_ok=True)
    
    pth_path = model_dir / f"{clean_model_name}.pth"
    index_path = model_dir / f"{clean_model_name}.index"
    
    # 1. Download .pth if missing
    if not pth_path.exists():
        if model_file_url:
            file_id = extract_gdrive_file_id(model_file_url)
            if file_id:
                logger.info(f"Downloading .pth model file for '{clean_model_name}' (ID: {file_id})...")
                download_file_from_gdrive(file_id, pth_path)
            else:
                logger.warning(f"Invalid Google Drive URL for .pth model: {model_file_url}")
        else:
            # Create a placeholder cache marker so inference service knows model definition
            pth_path.write_text(f"model_cache_marker: {clean_model_name}")
            logger.info(f"Created local model marker for {clean_model_name} at {pth_path}")
            
    # 2. Download .index if provided and missing
    if index_file_url and not index_path.exists():
        index_id = extract_gdrive_file_id(index_file_url)
        if index_id:
            logger.info(f"Downloading .index file for '{clean_model_name}' (ID: {index_id})...")
            download_file_from_gdrive(index_id, index_path)

    return (
        pth_path if pth_path.exists() else None,
        index_path if index_path.exists() else None
    )
