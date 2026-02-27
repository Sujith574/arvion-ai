"""
Admin Router  (Admin/SuperAdmin only)
======================================
Dashboard analytics, query logs, and system management.
All routes protected by require_admin dependency.
"""

from fastapi import APIRouter, Depends, HTTPException
from app.services.firebase import get_db
from app.dependencies import require_admin, require_super_admin
from pydantic import BaseModel, EmailStr
from typing import Optional
import logging
from datetime import datetime

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

@router.post("/university-requests/{request_id}/reject")
async def reject_university_request(request_id: str, _=Depends(require_admin)):
    """Super admin: reject a university request."""
    db = get_db()
    req_doc = db.collection("university_requests").document(request_id).get()
    if not req_doc.exists:
        raise HTTPException(404, "Request not found")

    # Update request status to rejected
    db.collection("university_requests").document(request_id).update({"status": "rejected"})
    return {"message": "University request rejected"}


@router.get("/universities")
async def admin_list_universities(_=Depends(require_admin)):
    """
    Admin: list all universities directly from Firestore (bypassing public TTL cache).
    This ensures admins always see the latest state (e.g. after deletion).
    """
    db = get_db()
    # Direct fetch from DB, no TTL cache here
    docs = db.collection("universities").stream()
    unis = [{"id": d.id, **d.to_dict()} for d in docs]
    return {"universities": unis}


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
async def delete_university(slug: str, _=Depends(require_super_admin)):
    """Super Admin: delete a university and ALL its data across collections using batches."""
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

    kb_count = _bulk_delete("university_knowledge", "university_id", slug)
    _bulk_delete("query_logs", "university_id", slug)
    _bulk_delete("query_feedback", "university_id", slug)
    _bulk_delete("university_cms", "university_id", slug)
    db.collection("universities").document(slug).delete()
    
    from app.services.firebase import invalidate_universities_cache
    invalidate_universities_cache(slug)
    
    return {"message": f"University '{slug}' and {kb_count} knowledge entries deleted permanently."}


# ── University Admin Management ─────────────────────────────────────────

class CreateUniAdminRequest(BaseModel):
    email: EmailStr
    display_name: str
    university_id: str
    password: str

class AssignUniversityRequest(BaseModel):
    university_id: str

@router.get("/users")
async def list_all_users(role: Optional[str] = None, _=Depends(require_super_admin)):
    """Super Admin: list all users, optionally filtered by role."""
    db = get_db()
    query = db.collection("users")
    if role:
        query = query.where("role", "==", role)
    docs = query.stream()
    users = []
    for d in docs:
        u = {"id": d.id, **d.to_dict()}
        u.pop("hashed_password", None)  # never expose passwords
        users.append(u)
    return {"users": users, "total": len(users)}


@router.post("/users/university-admin")
async def create_university_admin(req: CreateUniAdminRequest, _=Depends(require_super_admin)):
    """Super Admin: create a University Admin user and assign them a university."""
    from app.services.auth_service import hash_password
    from firebase_admin import firestore as fs
    import uuid
    db = get_db()
    
    # Check if email already exists
    existing = list(db.collection("users").where("email", "==", req.email).get())
    if existing:
        raise HTTPException(400, "Email already registered")
    
    uid = str(uuid.uuid4())
    db.collection("users").document(uid).set({
        "email": req.email,
        "display_name": req.display_name,
        "hashed_password": hash_password(req.password),
        "role": "university_admin",
        "university_id": req.university_id,
        "is_active": True,
        "status": "approved",
        "created_at": fs.SERVER_TIMESTAMP,
        "updated_at": fs.SERVER_TIMESTAMP,
    })
    return {"message": f"University Admin {req.email} created and assigned to {req.university_id}", "uid": uid}


@router.patch("/users/{uid}/assign-university")
async def assign_university_to_admin(uid: str, req: AssignUniversityRequest, _=Depends(require_super_admin)):
    """Super Admin: assign (or reassign) a university to an existing admin."""
    db = get_db()
    doc_ref = db.collection("users").document(uid)
    if not doc_ref.get().exists:
        raise HTTPException(404, "User not found")
    doc_ref.update({"university_id": req.university_id, "updated_at": datetime.utcnow().isoformat()})
    return {"message": f"User {uid} assigned to university {req.university_id}"}


@router.patch("/users/{uid}/activate")
async def activate_user(uid: str, _=Depends(require_super_admin)):
    """Super Admin: activate a pending university admin account."""
    db = get_db()
    doc_ref = db.collection("users").document(uid)
    if not doc_ref.get().exists:
        raise HTTPException(404, "User not found")
    doc_ref.update({"is_active": True, "status": "approved", "updated_at": datetime.utcnow().isoformat()})
    return {"message": f"User {uid} activated"}


@router.patch("/users/{uid}/deactivate")
async def deactivate_user(uid: str, _=Depends(require_super_admin)):
    """Super Admin: deactivate a user account."""
    db = get_db()
    doc_ref = db.collection("users").document(uid)
    if not doc_ref.get().exists:
        raise HTTPException(404, "User not found")
    doc_ref.update({"is_active": False, "status": "inactive", "updated_at": datetime.utcnow().isoformat()})
    return {"message": f"User {uid} deactivated"}


@router.delete("/users/{uid}")
async def delete_user(uid: str, _=Depends(require_super_admin)):
    """Super Admin: permanently delete a user account."""
    db = get_db()
    doc_ref = db.collection("users").document(uid)
    if not doc_ref.get().exists:
        raise HTTPException(404, "User not found")
    doc_ref.delete()
    return {"message": f"User {uid} deleted"}
