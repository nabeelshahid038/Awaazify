import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import FRONTEND_URL, TEMP_AUDIO_DIR, MODELS_CACHE_DIR, HOST, PORT
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
origins = [
    FRONTEND_URL,
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file mounts for temp audio and cached model previews
app.mount("/temp_audio", StaticFiles(directory=str(TEMP_AUDIO_DIR)), name="temp_audio")
app.mount("/models_cache", StaticFiles(directory=str(MODELS_CACHE_DIR)), name="models_cache")

# Include Routers
app.include_router(covers.router)
app.include_router(voices.router)
app.include_router(payments.router)
app.include_router(admin.router)

@app.get("/")
def root():
    return {
        "platform": "Awaazify AI Audio Engine",
        "status": "online",
        "docs": "/docs",
        "version": "1.0.0"
    }

@app.get("/health")
def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=HOST, port=PORT, reload=True)
