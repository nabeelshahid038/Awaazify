import os
from pathlib import Path
from dotenv import load_dotenv

# Base paths
BASE_DIR = Path(__file__).resolve().parent.parent
MODELS_CACHE_DIR = BASE_DIR / "models_cache"
TEMP_AUDIO_DIR = BASE_DIR / "temp_audio"

# Ensure directories exist
MODELS_CACHE_DIR.mkdir(parents=True, exist_ok=True)
TEMP_AUDIO_DIR.mkdir(parents=True, exist_ok=True)

# Load .env file
ENV_PATH = BASE_DIR / ".env"
load_dotenv(dotenv_path=ENV_PATH)

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://your-project-id.supabase.co").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "your-service-role-key")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
RVC_CLI_PATH = os.getenv("RVC_CLI_PATH", "")
PORT = int(os.getenv("PORT", "8000"))
HOST = os.getenv("HOST", "0.0.0.0")

# External GPU Worker (Modal.com or Google Colab Cloudflare Tunnel)
GPU_WORKER_URL = os.getenv("GPU_WORKER_URL", "").rstrip("/")
GPU_WORKER_API_KEY = os.getenv("GPU_WORKER_API_KEY", "")
