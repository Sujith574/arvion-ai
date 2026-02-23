"""
Universities Router
====================
Public endpoints for browsing available universities.
Admins can add/update universities via the admin router (protected).
"""

from fastapi import APIRouter, HTTPException, Response
from app.services.firebase import get_db, invalidate_universities_cache
import time

router = APIRouter()

# ── In-memory cache for university list (reset on server restart) ─────────
_list_cache: dict = {"data": None, "ts": 0.0}
_CACHE_TTL = 90  # 90 seconds — balances freshness vs load


@router.get("/")
async def list_universities(response: Response):
    """Return all active universities — cached 90s to handle high traffic."""
    now = time.monotonic()
    if _list_cache["data"] is not None and (now - _list_cache["ts"]) < _CACHE_TTL:
        response.headers["X-Cache"] = "HIT"
        response.headers["Cache-Control"] = f"public, max-age={_CACHE_TTL}, stale-while-revalidate=60"
        return _list_cache["data"]

    db = get_db()
    docs = db.collection("universities").stream()
    unis = []
    for doc in docs:
        data = doc.to_dict()
        if data.get("status") == "active" or data.get("active") is True:
            unis.append({
                "id": doc.id,
                "name": data.get("name"),
                "slug": data.get("slug"),
                "logo_url": data.get("logo_url"),
                "location": data.get("location"),
                "description": data.get("description"),
                "established": data.get("established"),
                "students_count": data.get("students_count"),
            })

    result = {"universities": unis}
    _list_cache["data"] = result
    _list_cache["ts"] = now

    response.headers["X-Cache"] = "MISS"
    response.headers["Cache-Control"] = f"public, max-age={_CACHE_TTL}, stale-while-revalidate=60"
    return result


@router.get("/{slug}")
async def get_university_detail(slug: str, response: Response):
    """Return full details of a specific university by slug — cached."""
    now = time.monotonic()
    cache_key = f"uni_detail:{slug}"

    from app.services.firebase import _universities_cache, _CACHE_TTL_SECONDS
    cached = _universities_cache.get(cache_key)
    if cached and (now - cached["ts"]) < _CACHE_TTL_SECONDS:
        response.headers["X-Cache"] = "HIT"
        return cached["data"]

    db = get_db()
    doc = db.collection("universities").document(slug).get()
    if not doc.exists:
        raise HTTPException(404, "University not found")
    data = doc.to_dict()
    if not data.get("active"):
        raise HTTPException(403, "University not yet active")

    result = {"university": {"id": doc.id, **data}}
    _universities_cache[cache_key] = {"data": result, "ts": now}
    response.headers["X-Cache"] = "MISS"
    return result
