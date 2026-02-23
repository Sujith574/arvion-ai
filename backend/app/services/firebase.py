import firebase_admin
from firebase_admin import credentials, firestore
from app.config import get_settings
from functools import lru_cache
from typing import Optional
import time
import logging

logger = logging.getLogger(__name__)

_db = None

# ── Simple in-memory TTL cache for frequently fetched data ────────────────
_universities_cache: dict = {}
_universities_cache_ttl: float = 0.0
_CACHE_TTL_SECONDS = 120  # 2 minute cache for university list


def init_firebase():
    settings = get_settings()
    if not firebase_admin._apps:
        import firebase_admin
from firebase_admin import credentials

def init_firebase():
    if not firebase_admin._apps:
        cred = credentials.ApplicationDefault()
        firebase_admin.initialize_app(cred, {
            "projectId": settings.FIREBASE_PROJECT_ID
        })


def get_db():
    global _db
    if _db is None:
        _db = firestore.client()
    return _db


async def get_university(slug: str) -> dict | None:
    """Fetch single university — cached with TTL."""
    now = time.monotonic()
    cache_key = f"uni:{slug}"

    cached = _universities_cache.get(cache_key)
    if cached and (now - cached["ts"]) < _CACHE_TTL_SECONDS:
        return cached["data"]

    db = get_db()
    doc = db.collection("universities").document(slug).get()
    result = doc.to_dict() if doc.exists else None
    _universities_cache[cache_key] = {"data": result, "ts": now}
    return result


async def get_universities_list() -> list[dict]:
    """Fetch all universities — cached with TTL."""
    now = time.monotonic()
    cache_key = "uni:__all__"

    cached = _universities_cache.get(cache_key)
    if cached and (now - cached["ts"]) < _CACHE_TTL_SECONDS:
        return cached["data"]

    db = get_db()
    docs = db.collection("universities").stream()
    result = [{"id": d.id, **d.to_dict()} for d in docs]
    _universities_cache[cache_key] = {"data": result, "ts": now}
    return result


def invalidate_universities_cache(slug: Optional[str] = None):
    """Bust the university cache after a mutation."""
    if slug:
        _universities_cache.pop(f"uni:{slug}", None)
    _universities_cache.pop("uni:__all__", None)


async def get_knowledge_base(university_id: str) -> list[dict]:
    db = get_db()
    docs = (
        db.collection("university_knowledge")
        .where("university_id", "==", university_id)
        .where("verified", "==", True)
        .stream()
    )
    return [{"id": d.id, **d.to_dict()} for d in docs]


async def log_query(log_data: dict):
    db = get_db()
    db.collection("query_logs").add(log_data)
