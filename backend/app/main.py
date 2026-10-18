import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import FRONTEND_URL, HOST, PORT
from app.routers import covers, voices, payments, admin

# Setup Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("awaazify.main")

app = FastAPI(
    title="Awaazify AI Audio Engine",
    description="Production-ready FastAPI backend for Awaazify AI Voice Studio SaaS",
    version="1.0.0"
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
