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
        try:
            # 1. Attempt using Service Account JSON string (Cloud Run Secret/Env)
            import json
            if settings.FIREBASE_SERVICE_ACCOUNT_JSON:
                logger.info("[Firebase] Initializing with service account JSON from environment")
                sa_info = json.loads(settings.FIREBASE_SERVICE_ACCOUNT_JSON)
                cred = credentials.Certificate(sa_info)
                firebase_admin.initialize_app(cred)
            # 2. Attempt using Service Account JSON file (Local Dev)
            elif os.path.exists(settings.FIREBASE_SERVICE_ACCOUNT_PATH):
                logger.info(f"[Firebase] Initializing with service account: {settings.FIREBASE_SERVICE_ACCOUNT_PATH}")
                cred = credentials.Certificate(settings.FIREBASE_SERVICE_ACCOUNT_PATH)
                firebase_admin.initialize_app(cred)
            else:
                # 3. Fallback to Application Default Credentials
                logger.info("[Firebase] Fallback to Application Default Credentials (ADC)")
                cred = credentials.ApplicationDefault()
                firebase_admin.initialize_app(cred, {
                    "projectId": settings.FIREBASE_PROJECT_ID
                })
        except Exception as e:
            logger.error(f"[Firebase] Initialization critical failure: {e}")
            # Do not re-throw, let the app try to start, though Firestore calls will fail later


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
    # 1. Fetch from standard knowledge base
    kb_docs = (
        db.collection("university_knowledge")
        .select(["question", "answer", "category", "source", "embedding_vector"])
        .where("university_id", "==", university_id)
        .where("verified", "==", True)
        .stream()
    )
    entries = [{"id": d.id, **d.to_dict()} for d in kb_docs]

    # 2. Fetch from new Dynamic CMS (Admissions, Fees, etc.) - ONLY APPROVED
    cms_docs = (
        db.collection("university_cms")
        .select(["title", "content", "section_id", "embedding_vector", "is_deleted", "status"])
        .where("university_id", "==", university_id)
        .where("is_deleted", "==", False)
        .where("status", "==", "approved")
        .stream()
    )
    for d in cms_docs:
        data = d.to_dict()
        emb = data.get("embedding_vector")
        if not emb:  # skip entries with empty embeddings
            continue
        entries.append({
            "id": d.id,
            "question": data.get("title"),
            "answer": data.get("content"),
            "category": data.get("section_id"),
            "source": f"cms:{data.get('section_id')}",
            "embedding_vector": emb
        })

    return entries


async def log_query(log_data: dict) -> str:
    db = get_db()
    # Add timestamp if not present
    if "timestamp" not in log_data:
        import datetime
        log_data["timestamp"] = datetime.datetime.utcnow().isoformat()
        
    _, doc_ref = db.collection("query_logs").add(log_data)
    return doc_ref.id


async def store_feedback(feedback_data: dict) -> str:
    db = get_db()
    if "timestamp" not in feedback_data:
        import datetime
        feedback_data["timestamp"] = datetime.datetime.utcnow().isoformat()
        
    _, doc_ref = db.collection("query_feedback").add(feedback_data)
    return doc_ref.id
