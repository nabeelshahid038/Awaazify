import uuid
import httpx
from app.config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

INITIAL_VOICE_MODELS = [
    {
        "id": "e81d4fae-7dec-11d0-a765-00a0c91e6bf1",
        "name": "Babar Azam",
        "subtitle": "Crisp, friendly voice for upbeat and viral song covers",
        "category": "Cricketers & Celebs",
        "usage_count": 19840,
        "avatar_config": {
            "silhouetteType": "athlete",
            "gradientTheme": "amber",
            "baseFreqHz": 185
        },
        "model_file_url": "https://drive.google.com/file/d/1BabarAzamModelFilePlaceholder/view",
        "index_file_url": "https://drive.google.com/file/d/1BabarAzamIndexFilePlaceholder/view",
        "preview_audio_url": "https://zvmixkkymxgnqatxehqg.supabase.co/storage/v1/object/public/rvc-models/babar_azam_demo.mp3",
        "default_pitch": 0,
        "status": "Active",
        "is_custom": False,
        "owner_user_id": None
    },
    {
        "id": "e81d4fae-7dec-11d0-a765-00a0c91e6bf2",
        "name": "Atif Aslam",
        "subtitle": "Soulful romantic vocals for acoustic and pop tracks",
        "category": "Singers",
        "usage_count": 24500,
        "avatar_config": {
            "silhouetteType": "vocalist",
            "gradientTheme": "emerald",
            "baseFreqHz": 220
        },
        "model_file_url": "https://drive.google.com/file/d/1AtifAslamModelFilePlaceholder/view",
        "index_file_url": "https://drive.google.com/file/d/1AtifAslamIndexFilePlaceholder/view",
        "preview_audio_url": "https://zvmixkkymxgnqatxehqg.supabase.co/storage/v1/object/public/rvc-models/atif_aslam_demo.mp3",
        "default_pitch": 0,
        "status": "Active",
        "is_custom": False,
        "owner_user_id": None
    },
    {
        "id": "e81d4fae-7dec-11d0-a765-00a0c91e6bf3",
        "name": "Imran Khan",
        "subtitle": "Deep, commanding baritone with unmistakable delivery",
        "category": "Public Leaders",
        "usage_count": 28100,
        "avatar_config": {
            "silhouetteType": "orator",
            "gradientTheme": "emerald",
            "baseFreqHz": 155
        },
        "model_file_url": "https://drive.google.com/file/d/1ImranKhanModelFilePlaceholder/view",
        "index_file_url": "https://drive.google.com/file/d/1ImranKhanIndexFilePlaceholder/view",
        "preview_audio_url": "https://zvmixkkymxgnqatxehqg.supabase.co/storage/v1/object/public/rvc-models/imran_khan_demo.mp3",
        "default_pitch": -2,
        "status": "Active",
        "is_custom": False,
        "owner_user_id": None
    },
    {
        "id": "e81d4fae-7dec-11d0-a765-00a0c91e6bf4",
        "name": "Sidhu Moosewala",
        "subtitle": "High-energy Punjabi folk and hip-hop vocal presence",
        "category": "Singers",
        "usage_count": 31200,
        "avatar_config": {
            "silhouetteType": "vocalist",
            "gradientTheme": "amber",
            "baseFreqHz": 196
        },
        "model_file_url": "https://drive.google.com/file/d/1SidhuModelFilePlaceholder/view",
        "index_file_url": "https://drive.google.com/file/d/1SidhuIndexFilePlaceholder/view",
        "preview_audio_url": "https://zvmixkkymxgnqatxehqg.supabase.co/storage/v1/object/public/rvc-models/sidhu_demo.mp3",
        "default_pitch": 0,
        "status": "Active",
        "is_custom": False,
        "owner_user_id": None
    },
    {
        "id": "e81d4fae-7dec-11d0-a765-00a0c91e6bf5",
        "name": "Nusrat Fateh Ali Khan",
        "subtitle": "Legendary classical range for emotional and traditional songs",
        "category": "Singers",
        "usage_count": 17900,
        "avatar_config": {
            "silhouetteType": "vocalist",
            "gradientTheme": "sky",
            "baseFreqHz": 246.9
        },
        "model_file_url": "https://drive.google.com/file/d/1NusratModelFilePlaceholder/view",
        "index_file_url": "https://drive.google.com/file/d/1NusratIndexFilePlaceholder/view",
        "preview_audio_url": "https://zvmixkkymxgnqatxehqg.supabase.co/storage/v1/object/public/rvc-models/nusrat_demo.mp3",
        "default_pitch": 0,
        "status": "Active",
        "is_custom": False,
        "owner_user_id": None
    },
    {
        "id": "e81d4fae-7dec-11d0-a765-00a0c91e6bf6",
        "name": "Arijit Singh",
        "subtitle": "Warm, expressive melody voice for slow ballads",
        "category": "Singers",
        "usage_count": 22450,
        "avatar_config": {
            "silhouetteType": "vocalist",
            "gradientTheme": "rose",
            "baseFreqHz": 233.1
        },
        "model_file_url": "https://drive.google.com/file/d/1ArijitModelFilePlaceholder/view",
        "index_file_url": "https://drive.google.com/file/d/1ArijitIndexFilePlaceholder/view",
        "preview_audio_url": "https://zvmixkkymxgnqatxehqg.supabase.co/storage/v1/object/public/rvc-models/arijit_demo.mp3",
        "default_pitch": 0,
        "status": "Active",
        "is_custom": False,
        "owner_user_id": None
    },
    {
        "id": "e81d4fae-7dec-11d0-a765-00a0c91e6bf7",
        "name": "The Weeknd",
        "subtitle": "Smooth modern pop and upbeat radio vocals",
        "category": "Global Stars",
        "usage_count": 15400,
        "avatar_config": {
            "silhouetteType": "popstar",
            "gradientTheme": "violet",
            "baseFreqHz": 261.6
        },
        "model_file_url": "https://drive.google.com/file/d/1WeekndModelFilePlaceholder/view",
        "index_file_url": "https://drive.google.com/file/d/1WeekndIndexFilePlaceholder/view",
        "preview_audio_url": "https://zvmixkkymxgnqatxehqg.supabase.co/storage/v1/object/public/rvc-models/weeknd_demo.mp3",
        "default_pitch": 2,
        "status": "Active",
        "is_custom": False,
        "owner_user_id": None
    },
    {
        "id": "e81d4fae-7dec-11d0-a765-00a0c91e6bf8",
        "name": "Taylor Swift",
        "subtitle": "Bright, clear acoustic and pop female vocals",
        "category": "Global Stars",
        "usage_count": 14100,
        "avatar_config": {
            "silhouetteType": "popstar",
            "gradientTheme": "rose",
            "baseFreqHz": 277.2
        },
        "model_file_url": "https://drive.google.com/file/d/1TaylorModelFilePlaceholder/view",
        "index_file_url": "https://drive.google.com/file/d/1TaylorIndexFilePlaceholder/view",
        "preview_audio_url": "https://zvmixkkymxgnqatxehqg.supabase.co/storage/v1/object/public/rvc-models/taylor_demo.mp3",
        "default_pitch": 2,
        "status": "Active",
        "is_custom": False,
        "owner_user_id": None
    }
]

def seed():
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }
    with httpx.Client(timeout=15.0) as client:
        res = client.post(f"{SUPABASE_URL}/rest/v1/voice_models", headers=headers, json=INITIAL_VOICE_MODELS)
        print("Seed status:", res.status_code, res.text)

if __name__ == "__main__":
    seed()
