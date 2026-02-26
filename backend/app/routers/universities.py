"""
Universities Router
====================
Public endpoints for browsing available universities.
Admins can add/update universities via the admin router (protected).
"""

from fastapi import APIRouter, HTTPException, Response
from app.services.firebase import get_db, invalidate_universities_cache
import time

from app.services.firebase import get_db, get_university, get_universities_list, invalidate_universities_cache

router = APIRouter()


@router.get("/")
async def list_universities(response: Response):
    """Return all active universities — cached centrally with TTL."""
    unis_all = await get_universities_list()
    
    # Filter for active only
    active_unis = []
    for u in unis_all:
        if u.get("status") == "active" or u.get("active") is True:
            # Minimize payload for public list
            active_unis.append({
                "id": u["id"],
                "name": u.get("name"),
                "slug": u.get("slug"),
                "logo_url": u.get("logo_url"),
                "location": u.get("location"),
                "description": u.get("description"),
                "established": u.get("established"),
                "students_count": u.get("students_count"),
                "uploaded_files": u.get("uploaded_files", []),
            })

    response.headers["Cache-Control"] = "public, max-age=90, stale-while-revalidate=60"
    return {"universities": active_unis}


@router.get("/{slug}")
async def get_university_detail(slug: str, response: Response):
    """Return full details of a specific university by slug — cached."""
    uni = await get_university(slug)
    if not uni:
        raise HTTPException(404, "University not found")
    
    if not uni.get("active"):
        raise HTTPException(403, "University not yet active")

    response.headers["Cache-Control"] = "public, max-age=60"
    return {"university": {"id": slug, **uni}}
