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

# Dedicated, limited-scope Supabase key for the external GPU worker.
# SECURITY (P0): the backend's SERVICE_ROLE key must NEVER be sent to the
# worker. Create a separate key with the minimum scope the worker needs
# (e.g. a restricted Supabase API key) and set it here / on Railway as
# GPU_WORKER_SUPABASE_KEY. Backend code fails loudly if it is unset.
GPU_WORKER_SUPABASE_KEY = os.getenv("GPU_WORKER_SUPABASE_KEY", "")


def _int_env(name: str, default: int) -> int:
    """Read an int env var defensively; fall back to default on garbage."""
    try:
        return int(os.getenv(name, str(default)))
    except (TypeError, ValueError):
        return default


# Rate limiting (P2): requests/minute per client IP on /api/* routes.
RATE_LIMIT_PER_MINUTE = _int_env("RATE_LIMIT_PER_MINUTE", 60)
# Stricter budget for abuse-sensitive endpoints (login/sync, payments).
RATE_LIMIT_STRICT_PER_MINUTE = _int_env("RATE_LIMIT_STRICT_PER_MINUTE", 20)

# Sentry error tracking (P2): optional. Empty DSN = disabled; the backend
# runs fine without it. Set SENTRY_DSN on Railway to enable.
SENTRY_DSN = os.getenv("SENTRY_DSN", "")
SENTRY_RELEASE = os.getenv("SENTRY_RELEASE", "awaazify-backend@1.0.0")
SENTRY_ENVIRONMENT = os.getenv("SENTRY_ENVIRONMENT", "production")
