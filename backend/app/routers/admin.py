"""
Admin Router  (Admin/SuperAdmin only)
======================================
Dashboard analytics, query logs, and system management.
All routes protected by require_admin dependency.
"""

from fastapi import APIRouter, Depends, HTTPException
from app.services.firebase import get_db
from app.dependencies import require_admin
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/stats/{university_slug}")
async def admin_stats(university_slug: str, _=Depends(require_admin)):
    """
    Return dashboard stats for a university admin.
    Optimized: Limits scan to 2k queries + uses select() for speed.
    """
    db = get_db()
    logs_stream = (
        db.collection("query_logs")
        .where("university_id", "==", university_slug)
        .order_by("timestamp", direction="DESCENDING")
        .limit(2000)
        .select(["confidence_score", "used_fallback_llm", "category"])
        .stream()
    )

    logs = list(logs_stream)
    if not logs:
        return {
            "total_queries": 0, "avg_confidence": 0,
            "fallback_rate": 0, "low_confidence_count": 0,
            "categories": {},
        }

    total = len(logs)
    fallbacks = 0
    conf_sum = 0
    low_conf = 0
    categories: dict = {}

    for doc in logs:
        d = doc.to_dict()
        conf = d.get("confidence_score", 0)
        conf_sum += conf
        if d.get("used_fallback_llm"):
            fallbacks += 1
        if conf < 0.5:
            low_conf += 1
        
        cat = d.get("category", "unknown")
        categories[cat] = categories.get(cat, 0) + 1

    return {
        "total_queries": total,
        "avg_confidence": round(conf_sum / total, 3) if total else 0,
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


@router.get("/feedback/{university_slug}")
async def admin_feedback(university_slug: str, limit: int = 50, _=Depends(require_admin)):
    """Return recent user feedback for a university."""
    db = get_db()
    
    # Fetch feedback
    feedback_docs = (
        db.collection("query_feedback")
        .where("university_id", "==", university_slug)
        .order_by("timestamp", direction="DESCENDING")
        .limit(limit)
        .stream()
    )
    
    results = []
    for f_doc in feedback_docs:
        f_data = f_doc.to_dict()
        query_id = f_data.get("query_id")
        
        # Link back to the original query/response log
        log_data = {}
        if query_id:
            log_doc = db.collection("query_logs").document(query_id).get()
            if log_doc.exists:
                log_data = log_doc.to_dict()
        
        results.append({
            "id": f_doc.id,
            **f_data,
            "query_details": log_data
        })
        
    return {"feedback": results, "total": len(results)}


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
    slug = req.slug.lower().strip()
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
    
    from app.services.firebase import invalidate_universities_cache
    invalidate_universities_cache()
    
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
    
    from app.services.firebase import invalidate_universities_cache
    invalidate_universities_cache(slug)
    
    return {"message": f"University '{slug}' updated", "updates": list(updates.keys())}


@router.delete("/universities/{slug}")
async def delete_university(slug: str, _=Depends(require_admin)):
    """Admin: delete a university and ALL its data across collections using batches."""
    db = get_db()
    
    def _bulk_delete(collection_name: str, field: str, value: str):
        count = 0
        col = db.collection(collection_name)
        docs = list(col.where(field, "==", value).select([]).stream())
        batch = db.batch()
        for doc in docs:
            batch.delete(doc.reference)
            count += 1
            if count % 400 == 0:
                batch.commit()
                batch = db.batch()
        if count % 400 != 0:
            batch.commit()
        return count

    # 1. Delete knowledge
    kb_count = _bulk_delete("university_knowledge", "university_id", slug)
    
    # 2. Delete logs
    logger.info(f"[Delete] Cleaning up logs for {slug}...")
    _bulk_delete("query_logs", "university_id", slug)
    
    # 3. Delete feedback
    _bulk_delete("query_feedback", "university_id", slug)

    # 4. Delete the university doc
    db.collection("universities").document(slug).delete()
    
    from app.services.firebase import invalidate_universities_cache
    invalidate_universities_cache(slug)
    
    return {"message": f"University '{slug}' and {kb_count} knowledge entries deleted permanently."}
