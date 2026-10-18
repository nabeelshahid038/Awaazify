import logging
from urllib.parse import quote
from fastapi import APIRouter
import httpx

router = APIRouter(prefix="/api/v1/utils", tags=["Utilities"])
logger = logging.getLogger("awaazify.utils")

# NOTE: intentionally PUBLIC (no JWT required). It proxies only YouTube's
# public oEmbed endpoint and returns public video metadata (title/author) so
# the studio trimmer can show real info instead of hardcoded placeholders.
# On any failure it returns 200 with nulls and the frontend falls back
# gracefully. If abuse becomes a concern, put get_current_user on it.


@router.get("/youtube-meta")
def youtube_metadata(url: str):
    """
    Fetch real YouTube video metadata server-side via the public oEmbed API.
    Returns {"title": str|None, "author_name": str|None} — nulls on any
    failure (invalid URL, network error, non-YouTube URL, timeout).
    """
    fallback = {"title": None, "author_name": None}
    if not url or "youtu" not in url.lower():
        return fallback
    try:
        oembed_url = f"https://www.youtube.com/oembed?url={quote(url, safe='')}&format=json"
        with httpx.Client(timeout=10.0) as client:
            res = client.get(oembed_url, headers={"User-Agent": "Awaazify/1.0"})
            if res.status_code != 200:
                return fallback
            data = res.json()
            return {
                "title": data.get("title"),
                "author_name": data.get("author_name"),
            }
    except Exception as e:
        logger.warning(f"youtube-meta failed for url={url[:80]}: {e}")
        return fallback
