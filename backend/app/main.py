import logging
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import (
    FRONTEND_URL, HOST, PORT,
    RATE_LIMIT_PER_MINUTE, RATE_LIMIT_STRICT_PER_MINUTE,
    SENTRY_DSN, SENTRY_RELEASE, SENTRY_ENVIRONMENT,
)
from app.middleware.rate_limit import RateLimitMiddleware
from app.routers import covers, voices, payments, admin, users, utils

# Setup Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("awaazify.main")

# P2: Sentry error tracking. Optional — initialized ONLY when SENTRY_DSN is
# set, and never allowed to crash the app when unset or misconfigured.
if SENTRY_DSN:
    try:
        import sentry_sdk
        sentry_sdk.init(
            dsn=SENTRY_DSN,
            release=SENTRY_RELEASE,
            environment=SENTRY_ENVIRONMENT,
            traces_sample_rate=0.0,  # error tracking only; no perf overhead
            send_default_pii=False,
        )
        logger.info("Sentry error tracking enabled.")
    except Exception as exc:  # never let telemetry break the app
        logger.warning(f"Sentry init failed; continuing without it: {exc}")
else:
    logger.info("SENTRY_DSN not set; Sentry disabled.")

app = FastAPI(
    title="Awaazify AI Audio Engine",
    description="Production-ready FastAPI backend for Awaazify AI Voice Studio SaaS",
    version="1.0.0"
)

# P2: rate limiting. Registered BEFORE CORSMiddleware so CORS stays outermost
# and even 429 responses carry CORS headers the frontend can read.
app.add_middleware(
    RateLimitMiddleware,
    requests_per_minute=RATE_LIMIT_PER_MINUTE,
    strict_per_minute=RATE_LIMIT_STRICT_PER_MINUTE,
)
logger.info(
    f"Rate limiting enabled: {RATE_LIMIT_PER_MINUTE}/min per IP on /api/*, "
    f"{RATE_LIMIT_STRICT_PER_MINUTE}/min on login/sync + payment endpoints."
)

# Configure CORS
# P0: never allow "*" together with allow_credentials=True. Only the
# configured frontend origin plus local dev origins are trusted.
_raw_origins = [
    FRONTEND_URL,
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]
origins = list(dict.fromkeys(o for o in _raw_origins if o and o.startswith("http") and o != "*"))
logger.info(f"CORS allowed origins: {origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# P0: the public /temp_audio and /models_cache static mounts have been REMOVED.
# They exposed in-progress user audio and model files to the world. Temp audio
# is still written to disk internally by the pipeline and uploaded to Supabase
# Storage via db.upload_file — it is never served over HTTP anymore.

# Include Routers
app.include_router(covers.router)
app.include_router(voices.router)
app.include_router(payments.router)
app.include_router(admin.router)
app.include_router(users.router)
app.include_router(utils.router)

@app.get("/")
@app.get("/api")
def root():
    return {
        "platform": "Awaazify AI Audio Engine",
        "status": "online",
        "docs": "/docs",
        "version": "1.0.0"
    }

@app.get("/health")
@app.get("/api/health")
def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=HOST, port=PORT, reload=True)
