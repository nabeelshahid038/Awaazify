import logging
from typing import Any, Dict, List, Optional
import httpx
from app.config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

logger = logging.getLogger("awaazify.database")

class SupabaseRestClient:
    """
    Direct PostgREST and Storage HTTP Client for Supabase.
    Works with live Supabase Service Role credentials and includes in-memory
    mock store when running tests or in offline local environments.
    """
    def __init__(self, url: str, service_role_key: str):
        self.base_url = url
        self.service_role_key = service_role_key
        self.rest_url = f"{url}/rest/v1"
        self.storage_url = f"{url}/storage/v1"
        self.headers = {
            "apikey": service_role_key,
            "Authorization": f"Bearer {service_role_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }
        # In-memory mock storage for development / offline testing
        self._mock_tables: Dict[str, List[Dict[str, Any]]] = {
            "users": [
                {
                    "id": "usr_test_001",
                    "email": "user@example.com",
                    "name": "Studio Creator",
                    "balance_pkr": 100,
                    "balance_usd": 1.98,
                    "song_credits": 2,
                    "voice_passes": 1,
                    "has_free_trial": True,
                }
            ],
            "voice_models": [
                {
                    "id": "vm-babar-azam",
                    "name": "Babar Azam",
                    "subtitle": "Crisp, friendly voice for upbeat and viral song covers",
                    "category": "Cricketers & Celebs",
                    "usage_count": 19840,
                    "avatar_config": {
                        "silhouetteType": "athlete",
                        "gradientTheme": "amber",
                        "baseFreqHz": 185,
                    },
                    "model_file_name": "babar_azam_voice.pth",
                    "extra_file_name": "babar_azam_voice.index",
                    "default_pitch": 0,
                    "status": "Active",
                    "featured": True,
                }
            ],
            "generated_songs": [],
            "payment_transactions": [],
            "voice_training_jobs": [],
        }

    def is_configured(self) -> bool:
        return bool(
            self.base_url 
            and "your-project-id" not in self.base_url 
            and self.service_role_key 
            and "your-service-role-key" not in self.service_role_key
        )

    def select(self, table: str, params: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        if not self.is_configured():
            items = self._mock_tables.get(table, [])
            if not params:
                return [dict(it) for it in items]
            
            filtered = []
            for item in items:
                matches = True
                for k, v in params.items():
                    if isinstance(v, str) and v.startswith("eq."):
                        target = v[3:]
                        if str(item.get(k)) != target:
                            matches = False
                            break
                    elif item.get(k) != v:
                        matches = False
                        break
                if matches:
                    filtered.append(dict(item))
            return filtered

        try:
            with httpx.Client(timeout=10.0) as client:
                res = client.get(f"{self.rest_url}/{table}", headers=self.headers, params=params)
                res.raise_for_status()
                return res.json()
        except Exception as e:
            logger.error(f"Error selecting from {table}: {e}")
            return []

    def insert(self, table: str, record: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if not self.is_configured():
            if table not in self._mock_tables:
                self._mock_tables[table] = []
            self._mock_tables[table].append(dict(record))
            return record

        try:
            with httpx.Client(timeout=10.0) as client:
                res = client.post(f"{self.rest_url}/{table}", headers=self.headers, json=record)
                res.raise_for_status()
                data = res.json()
                return data[0] if isinstance(data, list) and data else record
        except Exception as e:
            logger.error(f"Error inserting into {table}: {e}")
            return record

    def update(self, table: str, match_column: str, match_value: Any, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if not self.is_configured():
            items = self._mock_tables.get(table, [])
            for item in items:
                if str(item.get(match_column)) == str(match_value):
                    item.update(updates)
                    return item
            return updates

        try:
            with httpx.Client(timeout=10.0) as client:
                headers = dict(self.headers)
                params = {match_column: f"eq.{match_value}"}
                res = client.patch(f"{self.rest_url}/{table}", headers=headers, params=params, json=updates)
                res.raise_for_status()
                data = res.json()
                return data[0] if isinstance(data, list) and data else updates
        except Exception as e:
            logger.error(f"Error updating {table}: {e}")
            return updates

    def upload_file(self, bucket: str, path: str, file_bytes: bytes, content_type: str = "audio/mpeg") -> Optional[str]:
        if not self.is_configured():
            return f"{self.base_url}/storage/v1/object/public/{bucket}/{path}"
        try:
            upload_url = f"{self.storage_url}/object/{bucket}/{path}"
            headers = {
                "apikey": self.service_role_key,
                "Authorization": f"Bearer {self.service_role_key}",
                "Content-Type": content_type,
                "x-upsert": "true",
            }
            with httpx.Client(timeout=30.0) as client:
                res = client.post(upload_url, headers=headers, content=file_bytes)
                res.raise_for_status()
                return f"{self.storage_url}/object/public/{bucket}/{path}"
        except Exception as e:
            logger.error(f"Error uploading to Supabase storage '{bucket}/{path}': {e}")
            return f"{self.storage_url}/object/public/{bucket}/{path}"

    def download_file(self, bucket: str, path: str) -> Optional[bytes]:
        if not self.is_configured():
            return None
        try:
            url = f"{self.storage_url}/object/authenticated/{bucket}/{path}"
            headers = {
                "apikey": self.service_role_key,
                "Authorization": f"Bearer {self.service_role_key}",
            }
            with httpx.Client(timeout=30.0) as client:
                res = client.get(url, headers=headers)
                res.raise_for_status()
                return res.content
        except Exception as e:
            logger.error(f"Error downloading from Supabase storage '{bucket}/{path}': {e}")
            return None

# Try importing official supabase-py if available, else use SupabaseRestClient
try:
    from supabase import create_client, Client
    if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY and "your-project-id" not in SUPABASE_URL:
        supabase_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    else:
        supabase_client = None
except Exception:
    supabase_client = None

# Unified database & storage wrapper
db = SupabaseRestClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
