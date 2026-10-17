# Awaazify — AI Voice Studio SaaS

Production-ready monorepo combining the React/TypeScript/Tailwind CSS frontend with a Python FastAPI orchestrator, a Hybrid Serverless GPU Audio Engine (Modal.com & Google Colab), and Supabase PostgreSQL database + Storage buckets.

---

## 1. Monorepo Architecture

```
awaazify/
├── frontend/                        # React / TypeScript / Vite / Tailwind CSS
│   ├── src/
│   │   ├── components/              # UI Components (AuthModal, Trimmer, Studio Tools, BrandLogo)
│   │   ├── context/
│   │   │   └── AppContext.tsx       # Auth state, Supabase sync, wallet, and FastAPI hooks
│   │   ├── lib/
│   │   │   └── supabaseClient.ts    # @supabase/supabase-js client initialization
│   │   ├── services/
│   │   │   └── api.ts               # FastAPI REST hooks & Supabase Storage upload helpers
│   │   ├── types/
│   │   │   └── index.ts             # Domain & API payload TypeScript interfaces
│   │   └── utils/
│   │       └── audioEngine.ts       # Studio audio playback & web audio synthesis
│   ├── .env.example
│   ├── .env.local
│   └── package.json
│
├── backend/                         # Python FastAPI Orchestrator
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                  # FastAPI entry point, CORS, mounts
│   │   ├── config.py                # Environment configuration loader (GPU_WORKER_URL)
│   │   ├── database.py              # Supabase Service Role client + in-memory store
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   └── schemas.py           # Pydantic schemas (Section 3)
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── covers.py            # POST /api/v1/covers/generate (GPU worker offload + fallback)
│   │   │   ├── voices.py            # POST /api/v1/voices/train (GPU dataset clean + fallback)
│   │   │   ├── payments.py          # POST /api/v1/payments/local-verify (EasyPaisa/JazzCash)
│   │   │   └── admin.py             # POST /api/v1/admin/models & payment approvals
│   │   └── services/
│   │       ├── __init__.py
│   │       ├── drive_downloader.py  # Google Drive auto-downloader for .pth & .index
│   │       ├── youtube_clipper.py   # yt-dlp audio download & timestamp trimmer
│   │       ├── stem_separator.py    # Demucs (htdemucs) vocal / accompaniment separator
│   │       ├── rvc_inference.py     # Applio / RVC v2 inference engine (rmvpe)
│   │       ├── audio_mixer.py       # Vocal normalization & beat mixing
│   │       └── voice_cleaner.py     # Stationary noise reduction & silence trimmer
│   ├── models_cache/                # Downloaded .pth and .index model cache
│   ├── temp_audio/                  # Working directory for audio processing jobs
│   ├── requirements.txt
│   ├── .env.example
│   ├── .env
│   └── test_api.py                  # Integration test suite
│
├── gpu_worker/                      # Hybrid External GPU Worker Layer
│   ├── modal_app.py                 # Modal.com Serverless GPU worker (T4 GPU + Volume cache)
│   └── Awaazify_Colab_GPU_Worker.ipynb # Free Google Colab T4 GPU Notebook + Cloudflare Tunnel + Auto-save to Google Drive
│
└── README.md
```

---

## 2. Serverless GPU Worker Setup

The AI Audio Engine offloads heavy computations (`Demucs` vocal separation + `RVC v2` rmvpe voice conversion) to an external GPU. You can use either **Modal.com** or **Google Colab**.

### Option A: Modal.com (Production Serverless GPU)
1. Install Modal CLI:
   ```bash
   pip install modal
   modal setup
   ```
2. Deploy the worker:
   ```bash
   modal deploy gpu_worker/modal_app.py
   ```
3. Copy the generated deployment URL (e.g. `https://your-workspace--awaazify-gpu-worker-process-cover.modal.run`) and paste into `backend/.env`:
   ```env
   GPU_WORKER_URL=https://your-workspace--awaazify-gpu-worker.modal.run
   ```

### Option B: Google Colab (100% Free T4 GPU + Cloudflare Tunnel)
1. Open [`gpu_worker/Awaazify_Colab_GPU_Worker.ipynb`](file:///C:/Users/Lenovo/.gemini/antigravity/scratch/awaazify/gpu_worker/Awaazify_Colab_GPU_Worker.ipynb) in Google Colab.
2. Select runtime: **Runtime -> Change runtime type -> T4 GPU**.
3. **Run Cell 1:** Mounts your Google Drive (`MyDrive/Awaazify_Models`) and installs dependencies.
4. **Run Cell 2:** Starts the FastAPI GPU server with a free Cloudflare HTTPS tunnel and prints:
   ```
   🎉 AWAAZIFY GPU WORKER IS LIVE!
   🔗 PUBLIC HTTPS URL: https://xxxx.trycloudflare.com
   ```
5. Paste that URL into `backend/.env`:
   ```env
   GPU_WORKER_URL=https://xxxx.trycloudflare.com
   ```
6. **Custom Voice Training (Cell 3):**
   - Paste the `Cleaned_Dataset_URL` from the Admin Dashboard and choose a `User_Voice_Name`.
   - Trains the 250-epoch RVC v2 model on the free T4 GPU.
   - **Automatically saves the `.pth` and `.index` files to your Google Drive** (`MyDrive/Awaazify_Models/<User_Voice_Name>/`).

---

## 3. Web Backend Setup (FastAPI Orchestrator)

```bash
cd backend

# 1. Install dependencies
pip install -r requirements.txt

# 2. Configure environment (.env is pre-configured with Supabase credentials)
# Set GPU_WORKER_URL to your Modal or Colab Cloudflare URL (or leave empty for local fallback)

# 3. Start the FastAPI server
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
- API Docs: `http://localhost:8000/docs`

---

## 4. Frontend Setup (React Studio UI)

```bash
cd frontend

# 1. Install dependencies
npm install --legacy-peer-deps

# 2. Start Vite dev server
npm run dev
```
- Web Studio: `http://localhost:3000`

---

## 5. Core API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/covers/generate` | Quota check + offload to Modal/Colab GPU (Demucs + RVC v2) + upload to `final-songs` |
| `POST` | `/api/v1/voices/train` | 3-minute lock + offload to GPU cleaner + upload to `raw-uploads/cleaned/` |
| `POST` | `/api/v1/payments/local-verify` | Submit EasyPaisa / JazzCash TID and receipt image |
| `POST` | `/api/v1/admin/payments/{id}/approve` | Admin approves payment, crediting user balance & song credits |
| `POST` | `/api/v1/admin/models` | Publish voice models with Google Drive `.pth` & `.index` links |
| `POST` | `/api/v1/admin/training-jobs/{id}/publish` | Link trained custom voice to customer account |
