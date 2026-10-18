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

        # P0 follow-up: NEVER swallow insert failures. A failed write must
        # raise (→ HTTP 500) so the caller knows it didn't persist. Silent
        # fake-success caused "added but disappeared on refresh" bugs.
        with httpx.Client(timeout=10.0) as client:
            res = client.post(f"{self.rest_url}/{table}", headers=self.headers, json=record)
            res.raise_for_status()
            data = res.json()
            return data[0] if isinstance(data, list) and data else record

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

    def _match_filter(self, actual: Any, raw: Any) -> bool:
        """
        Match a single PostgREST-style filter against a stored value.
        Supports eq., neq., gt., gte., lt., lte. prefixes (bare values = eq.).
        Numeric-aware: tries float comparison, falls back to string compare.
        """
        op, target = "eq", raw
        if isinstance(raw, str):
            for prefix in ("neq.", "gte.", "lte.", "gt.", "lt.", "eq."):
                if raw.startswith(prefix):
                    op, target = prefix[:-1], raw[len(prefix):]
                    break
        def num(v):
            try:
                return float(v)
            except (TypeError, ValueError):
                return None
        an, tn = num(actual), num(target)
        if an is not None and tn is not None:
            actual, target = an, tn
        else:
            actual, target = str(actual), str(target)
        if op == "eq":
            return actual == target
        if op == "neq":
            return actual != target
        try:
            if op == "gt":
                return actual > target
            if op == "gte":
                return actual >= target
            if op == "lt":
                return actual < target
            if op == "lte":
                return actual <= target
        except TypeError:
            return False
        return False

    def update_where(
        self, table: str, filters: Dict[str, Any], updates: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Conditional UPDATE: applies `updates` only to rows matching ALL
        `filters` (PostgREST-style, e.g. {"id": "eq.1", "status": "eq.Pending",
        "balance_pkr": "gte.150"}).

        Returns the list of updated rows (empty list when nothing matched).
        This is the race-safe primitive for approve/reject and wallet
        deductions: the filter is evaluated atomically at update time, so
        concurrent callers cannot double-apply. Check the returned list
        length to detect a lost race (0 rows -> 409 Conflict).
        """
        if not self.is_configured():
            matched = []
            for item in self._mock_tables.get(table, []):
                if all(self._match_filter(item.get(k), v) for k, v in filters.items()):
                    item.update(updates)
                    matched.append(dict(item))
            return matched

        try:
            with httpx.Client(timeout=10.0) as client:
                # `Prefer: return=representation` (in self.headers) makes
                # PostgREST return the updated rows; [] when nothing matched.
                res = client.patch(
                    f"{self.rest_url}/{table}",
                    headers=self.headers,
                    params=filters,
                    json=updates,
                )
                res.raise_for_status()
                data = res.json()
                return data if isinstance(data, list) else []
        except Exception as e:
            logger.error(f"Error conditional-updating {table}: {e}")
            return []

    def insert_strict(self, table: str, record: Dict[str, Any]) -> Dict[str, Any]:
        """
        INSERT that RAISES on failure (e.g. primary-key conflict) instead of
        swallowing the error like insert(). Used for exactly-once guards with
        deterministic ids: a concurrent duplicate insert raises, letting the
        caller treat it as "already done".
        """
        if not self.is_configured():
            items = self._mock_tables.setdefault(table, [])
            rid = record.get("id")
            if rid is not None and any(str(it.get("id")) == str(rid) for it in items):
                raise RuntimeError(f"duplicate key: {table}.id={rid}")
            items.append(dict(record))
            return record

        with httpx.Client(timeout=10.0) as client:
            res = client.post(f"{self.rest_url}/{table}", headers=self.headers, json=record)
            res.raise_for_status()
            data = res.json()
            return data[0] if isinstance(data, list) and data else record

    def delete(self, table: str, match_column: str, match_value: Any) -> bool:
        """DELETE rows where match_column == match_value. Returns True if at
        least one row was deleted."""
        if not self.is_configured():
            items = self._mock_tables.get(table, [])
            before = len(items)
            self._mock_tables[table] = [
                it for it in items if str(it.get(match_column)) != str(match_value)
            ]
            return len(self._mock_tables[table]) < before

        try:
            with httpx.Client(timeout=10.0) as client:
                headers = dict(self.headers)
                params = {match_column: f"eq.{match_value}"}
                res = client.delete(f"{self.rest_url}/{table}", headers=headers, params=params)
                res.raise_for_status()
                data = res.json()
                return bool(data) if isinstance(data, list) else True
        except Exception as e:
            logger.error(f"Error deleting from {table}: {e}")
            return False

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
