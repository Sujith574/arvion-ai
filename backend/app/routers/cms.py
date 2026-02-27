from fastapi import APIRouter, Depends, HTTPException
from app.services.firebase import get_db
from app.dependencies import require_admin, require_super_admin, verify_university_access
from pydantic import BaseModel
from typing import Any, Dict, List, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

class CMSEntry(BaseModel):
    section_id: str
    university_id: str
    title: str
    content: str
    metadata: Dict[str, Any] = {}
    priority: int = 0
    tags: List[str] = []

class CMSEntryUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    priority: Optional[int] = None
    tags: Optional[List[str]] = None

def log_audit(university_id: str, section_id: str, action: str, entry_id: str, user_id: str):
    """Log CMS changes for audit trails."""
    db = get_db()
    db.collection("cms_audit_logs").add({
        "university_id": university_id,
        "section_id": section_id,
        "action": action,
        "entry_id": entry_id,
        "user_id": user_id,
        "timestamp": datetime.utcnow().isoformat()
    })

@router.get("/{university_id}/sections")
async def list_available_sections():
    """Returns the supported logical sections for the CMS."""
    return {
        "sections": [
            {"id": "emergency", "name": "Emergency Contacts", "icon": "🛡️"},
            {"id": "admissions", "name": "Admissions", "icon": "🎓"},
            {"id": "courses", "name": "Courses & Academics", "icon": "📚"},
            {"id": "fees", "name": "Fee Structure", "icon": "💰"},
            {"id": "scholarships", "name": "Scholarships", "icon": "🌟"},
            {"id": "hostel", "name": "Hostel Information", "icon": "🏠"},
            {"id": "placements", "name": "Placements", "icon": "💼"},
            {"id": "faculty", "name": "Faculty Directory", "icon": "👨‍🏫"},
            {"id": "events", "name": "Events", "icon": "📅"},
            {"id": "notices", "name": "Notices & Updates", "icon": "🔔"},
            {"id": "custom", "name": "Other / Custom", "icon": "✨"},
        ]
    }

@router.get("/{university_id}/{section_id}")
async def get_section_entries(university_id: str, section_id: str):
    """Retrieve all APPROVED entries for a section (PUBLIC)."""
    db = get_db()
    docs = (
        db.collection("university_cms")
        .where("university_id", "==", university_id)
        .where("section_id", "==", section_id)
        .where("is_deleted", "==", False)
        .where("status", "==", "approved")
        .stream()
    )
    entries = [{"id": d.id, **d.to_dict()} for d in docs]
    entries.sort(key=lambda x: (x.get("priority", 0), x.get("created_at", "")), reverse=True)
    return {"section_id": section_id, "entries": entries, "total": len(entries)}

@router.get("/admin/{university_id}/{section_id}")
async def get_admin_section_entries(university_id: str, section_id: str, admin_data=Depends(require_admin)):
    """Retrieve ALL active entries for a section (ADMIN DASHBOARD)."""
    verify_university_access(admin_data, university_id)
    db = get_db()
    docs = (
        db.collection("university_cms")
        .where("university_id", "==", university_id)
        .where("section_id", "==", section_id)
        .where("is_deleted", "==", False)
        .stream()
    )
    entries = [{"id": d.id, **d.to_dict()} for d in docs]
    entries.sort(key=lambda x: (x.get("priority", 0), x.get("created_at", "")), reverse=True)
    return {"section_id": section_id, "entries": entries, "total": len(entries)}

@router.post("/{university_id}/{section_id}")
async def create_cms_entry(
    university_id: str, 
    section_id: str, 
    entry: CMSEntry, 
    admin_data=Depends(require_admin)
):
    """Create a new CMS entry (Pending if University Admin, Approved if Super Admin)."""
    verify_university_access(admin_data, university_id)
    db = get_db()
    data = entry.dict()
    data["created_at"] = datetime.utcnow().isoformat()
    data["updated_at"] = data["created_at"]
    data["is_deleted"] = False
    
    # Enforce path consistency
    data["university_id"] = university_id
    data["section_id"] = section_id

    # If super admin, auto-approve. If university admin, pending.
    is_super_admin = admin_data.get("role") == "super_admin"
    data["status"] = "approved" if is_super_admin else "pending"

    # Compute embedding for chatbot indexing (only if approved)
    if data["status"] == "approved":
        from app.services.rag_service import get_embedding, invalidate_cache
        text_to_embed = f"{entry.title}: {entry.content}"
        data["embedding_vector"] = (await get_embedding(text_to_embed)).tolist()
        invalidate_cache(university_id)
    else:
        data["embedding_vector"] = []
    
    doc_ref = db.collection("university_cms").add(data)
    entry_id = doc_ref[1].id
    
    log_audit(university_id, section_id, f"create ({data['status']})", entry_id, admin_data["uid"])
    
    return {"message": "Entry created", "id": entry_id, "status": data["status"]}

@router.patch("/{university_id}/{section_id}/{entry_id}")
async def update_cms_entry(
    university_id: str,
    section_id: str,
    entry_id: str,
    entry_update: CMSEntryUpdate,
    admin_data=Depends(require_admin)
):
    """Update an existing CMS entry."""
    verify_university_access(admin_data, university_id)
    db = get_db()
    doc_ref = db.collection("university_cms").document(entry_id)
    doc = doc_ref.get()
    
    if not doc.exists:
        raise HTTPException(404, "Entry not found")
    
    existing = doc.to_dict()
    if existing.get("university_id") != university_id or existing.get("section_id") != section_id:
        raise HTTPException(403, "Access denied")

    updates = {k: v for k, v in entry_update.dict().items() if v is not None}
    updates["updated_at"] = datetime.utcnow().isoformat()

    is_super_admin = admin_data.get("role") == "super_admin"
    if not is_super_admin:
        updates["status"] = "pending" # Editing puts it back to pending for uni admins

    new_status = updates.get("status", existing.get("status", "approved"))

    # Recompute embedding if approved and content/title changed
    if new_status == "approved" and ("title" in updates or "content" in updates):
        from app.services.rag_service import get_embedding, invalidate_cache
        new_title = updates.get("title", existing.get("title"))
        new_content = updates.get("content", existing.get("content"))
        text_to_embed = f"{new_title}: {new_content}"
        updates["embedding_vector"] = (await get_embedding(text_to_embed)).tolist()
        invalidate_cache(university_id)
    
    if new_status == "pending" and existing.get("status") == "approved":
        # If it dropped to pending, zero out the embedding vector so it stops showing in chat until re-approved
        from app.services.rag_service import invalidate_cache
        updates["embedding_vector"] = []
        invalidate_cache(university_id)
        
    doc_ref.update(updates)
    log_audit(university_id, section_id, f"update ({new_status})", entry_id, admin_data["uid"])
    
    return {"message": "Entry updated", "status": new_status}

@router.delete("/{university_id}/{section_id}/{entry_id}")
async def delete_cms_entry(
    university_id: str,
    section_id: str,
    entry_id: str,
    admin_data=Depends(require_admin)
):
    """Soft delete a CMS entry (Auto deletes if super admin, else pending delete)."""
    verify_university_access(admin_data, university_id)
    db = get_db()
    doc_ref = db.collection("university_cms").document(entry_id)
    doc = doc_ref.get()
    
    if not doc.exists:
        raise HTTPException(404, "Entry not found")
        
    is_super_admin = admin_data.get("role") == "super_admin"
    
    if is_super_admin:
        doc_ref.update({
            "is_deleted": True,
            "deleted_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        })
        log_audit(university_id, section_id, "soft_delete (approved)", entry_id, admin_data["uid"])
    else:
        doc_ref.update({
            "status": "pending_delete",
            "updated_at": datetime.utcnow().isoformat()
        })
        log_audit(university_id, section_id, "soft_delete (pending)", entry_id, admin_data["uid"])
    
    from app.services.rag_service import invalidate_cache
    invalidate_cache(university_id)
    
    return {"message": "Entry deletion requested/completed"}

@router.post("/super-admin/approve/{entry_id}")
async def approve_cms_entry(entry_id: str, admin_data=Depends(require_super_admin)):
    """Super Admin approves a pending entry or a pending deletion."""
    db = get_db()
    doc_ref = db.collection("university_cms").document(entry_id)
    doc = doc_ref.get()
    
    if not doc.exists:
        raise HTTPException(404, "Entry not found")
        
    data = doc.to_dict()
    
    if data.get("status") == "pending_delete":
        doc_ref.update({"is_deleted": True, "status": "approved", "updated_at": datetime.utcnow().isoformat()})
        log_audit(data["university_id"], data["section_id"], "super_admin_approve_delete", entry_id, admin_data["uid"])
    else:
        # Recompute embedding on approval
        from app.services.rag_service import get_embedding, invalidate_cache
        text_to_embed = f"{data.get('title')}: {data.get('content')}"
        embedding_vector = (await get_embedding(text_to_embed)).tolist()
        
        doc_ref.update({
            "status": "approved", 
            "embedding_vector": embedding_vector,
            "updated_at": datetime.utcnow().isoformat()
        })
        log_audit(data["university_id"], data["section_id"], "super_admin_approve_create_update", entry_id, admin_data["uid"])
    
    from app.services.rag_service import invalidate_cache
    invalidate_cache(data["university_id"])
    return {"message": "Entry approved"}

@router.post("/super-admin/reject/{entry_id}")
async def reject_cms_entry(entry_id: str, admin_data=Depends(require_super_admin)):
    """Super Admin rejects a pending entry."""
    db = get_db()
    doc_ref = db.collection("university_cms").document(entry_id)
    doc = doc_ref.get()
    
    if not doc.exists:
        raise HTTPException(404, "Entry not found")
        
    data = doc.to_dict()
    doc_ref.update({"status": "rejected", "updated_at": datetime.utcnow().isoformat()})
    
    log_audit(data["university_id"], data["section_id"], "super_admin_reject", entry_id, admin_data["uid"])
    return {"message": "Entry rejected"}

@router.get("/super-admin/pending")
async def get_all_pending_entries(admin_data=Depends(require_super_admin)):
    """Retrieve all pending CMS entries across all universities."""
    db = get_db()
    docs = (
        db.collection("university_cms")
        .where("status", "in", ["pending", "pending_delete"])
        .where("is_deleted", "==", False)
        .stream()
    )
    entries = [{"id": d.id, **d.to_dict()} for d in docs]
    return {"entries": entries, "total": len(entries)}

@router.get("/audit-logs/{university_id}")
async def get_audit_logs(university_id: str, limit: int = 100, _=Depends(require_admin)):
    """Retrieve audit logs for a university."""
    db = get_db()
    docs = (
        db.collection("cms_audit_logs")
        .where("university_id", "==", university_id)
        .order_by("timestamp", direction="DESCENDING")
        .limit(limit)
        .stream()
    )
    logs = [{"id": d.id, **d.to_dict()} for d in docs]
    return {"logs": logs}
