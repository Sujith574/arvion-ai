"""
Admin Router  (Admin/SuperAdmin only)
======================================
Dashboard analytics, query logs, and system management.
All routes protected by require_admin dependency.
"""

from fastapi import APIRouter, Depends, HTTPException
from app.services.firebase import get_db
from app.dependencies import require_admin

router = APIRouter()


@router.get("/stats/{university_slug}")
async def admin_stats(university_slug: str, _=Depends(require_admin)):
    """
    Return dashboard stats for a university admin.
    Includes: total queries, avg confidence, fallback rate, low-confidence count.
    """
    db = get_db()
    logs = list(
        db.collection("query_logs")
        .where("university_id", "==", university_slug)
        .stream()
    )

    if not logs:
        return {
            "total_queries": 0,
            "avg_confidence": 0,
            "fallback_rate": 0,
            "low_confidence_count": 0,
            "categories": {},
        }

    data = [log.to_dict() for log in logs]
    total = len(data)
    fallbacks = sum(1 for d in data if d.get("used_fallback_llm"))
    confidences = [d.get("confidence_score", 0) for d in data]
    low_conf = sum(1 for c in confidences if c < 0.5)

    # Category breakdown
    categories: dict = {}
    for d in data:
        cat = d.get("category", "unknown")
        categories[cat] = categories.get(cat, 0) + 1

    return {
        "total_queries": total,
        "avg_confidence": round(sum(confidences) / total, 3) if total else 0,
        "fallback_rate": round(fallbacks / total * 100, 1) if total else 0,
        "low_confidence_count": low_conf,
        "categories": categories,
    }


@router.get("/logs/{university_slug}")
async def query_logs(university_slug: str, limit: int = 50, _=Depends(require_admin)):
    """Return recent query logs for a university (paginated)."""
    db = get_db()
    docs = (
        db.collection("query_logs")
        .where("university_id", "==", university_slug)
        .order_by("timestamp", direction="DESCENDING")
        .limit(limit)
        .stream()
    )
    logs = [{"id": d.id, **d.to_dict()} for d in docs]
    return {"logs": logs, "total": len(logs)}


@router.get("/university-requests")
async def get_university_requests(_=Depends(require_admin)):
    """Super admin: view all pending university addition requests."""
    db = get_db()
    docs = db.collection("university_requests").where("status", "==", "pending").stream()
    requests = [{"id": d.id, **d.to_dict()} for d in docs]
    return {"requests": requests}


@router.post("/university-requests/{request_id}/approve")
async def approve_university_request(request_id: str, _=Depends(require_admin)):
    """Super admin: approve a university request and create the university document."""
    db = get_db()
    req_doc = db.collection("university_requests").document(request_id).get()
    if not req_doc.exists:
        raise HTTPException(404, "Request not found")

    req = req_doc.to_dict()
    slug = req["university_name"].lower().replace(" ", "_")

    # Create university document
    db.collection("universities").document(slug).set({
        "name": req["university_name"],
        "slug": slug,
        "status": "active",
        "confidence_threshold": 0.75,
        "created_at": __import__("datetime").datetime.utcnow().isoformat(),
    })

    # Update request status
    db.collection("university_requests").document(request_id).update({"status": "approved"})
    return {"message": f"University '{slug}' approved and activated"}

from pydantic import BaseModel
class CreateUniversityRequest(BaseModel):
    name: str
    slug: str
    description: str = ""

@router.post("/universities")
async def create_university(req: CreateUniversityRequest, _=Depends(require_admin)):
    """Super admin: directly create a new university."""
    db = get_db()
    slug = req.slug.lower()
    doc_ref = db.collection("universities").document(slug)
    
    if doc_ref.get().exists:
        raise HTTPException(400, "University slug already exists")
        
    doc_ref.set({
        "name": req.name,
        "slug": slug,
        "description": req.description,
        "status": "active",
        "active": True,
        "confidence_threshold": 0.75,
        "created_at": __import__("datetime").datetime.utcnow().isoformat(),
    })
    return {"message": f"University '{slug}' created", "slug": slug}


class UpdateUniversityRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    location: str | None = None
    established: str | None = None
    students_count: str | None = None
    confidence_threshold: float | None = None
    active: bool | None = None


@router.patch("/universities/{slug}")
async def update_university(slug: str, req: UpdateUniversityRequest, _=Depends(require_admin)):
    """Admin: update university metadata fields."""
    db = get_db()
    doc_ref = db.collection("universities").document(slug)
    if not doc_ref.get().exists:
        raise HTTPException(404, "University not found")

    updates = {k: v for k, v in req.dict().items() if v is not None}
    updates["updated_at"] = __import__("datetime").datetime.utcnow().isoformat()
    doc_ref.update(updates)
    return {"message": f"University '{slug}' updated", "updates": list(updates.keys())}


@router.delete("/universities/{slug}")
async def delete_university(slug: str, _=Depends(require_admin)):
    """Admin: delete a university and ALL of its knowledge entries."""
    db = get_db()
    doc_ref = db.collection("universities").document(slug)
    if not doc_ref.get().exists:
        raise HTTPException(404, "University not found")

    # Delete all knowledge entries
    kb = list(db.collection("university_knowledge").where("university_id", "==", slug).stream())
    for d in kb:
        d.reference.delete()

    # Delete query logs
    logs = list(db.collection("query_logs").where("university_id", "==", slug).stream())
    for d in logs:
        d.reference.delete()

    # Delete the university doc
    doc_ref.delete()
    return {"message": f"University '{slug}' and {len(kb)} knowledge entries deleted"}
