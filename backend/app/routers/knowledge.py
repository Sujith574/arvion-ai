"""
Knowledge Router  (Admin-protected)
=====================================
Allows university admins to manage the knowledge base entries
used by the FAISS-based RAG system.

All write routes require admin-level JWT (checked via dependency).
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.services.firebase import get_db
from app.services.rag_service import invalidate_cache
from app.dependencies import require_admin
from firebase_admin import firestore
import uuid

router = APIRouter()


class KnowledgeEntry(BaseModel):
    university_id: str
    category: str
    question: str
    answer: str
    source: str = "admin"
    confidence_threshold: float = 0.75
    verified: bool = True


@router.get("/{university_slug}")
async def list_knowledge(university_slug: str, _=Depends(require_admin)):
    """List all knowledge entries for a university (admin only)."""
    db = get_db()
    docs = (
        db.collection("university_knowledge")
        .where("university_id", "==", university_slug)
        .stream()
    )
    entries = [{"id": d.id, **d.to_dict()} for d in docs]
    return {"entries": entries, "total": len(entries)}


@router.post("/")
async def add_knowledge(entry: KnowledgeEntry, _=Depends(require_admin)):
    """Add a new knowledge base entry (admin only)."""
    db = get_db()
    entry_id = str(uuid.uuid4())
    db.collection("university_knowledge").document(entry_id).set({
        **entry.dict(),
        "embedding_vector": None,  # Will be computed on next query
        "created_at": firestore.SERVER_TIMESTAMP,
    })
    # Invalidate FAISS cache so next query rebuilds index
    invalidate_cache(entry.university_id)
    return {"message": "Entry added", "id": entry_id}


@router.put("/{entry_id}")
async def update_knowledge(entry_id: str, entry: KnowledgeEntry, _=Depends(require_admin)):
    """Update an existing knowledge entry (admin only)."""
    db = get_db()
    doc = db.collection("university_knowledge").document(entry_id).get()
    if not doc.exists:
        raise HTTPException(404, "Entry not found")
    db.collection("university_knowledge").document(entry_id).update({
        **entry.dict(),
        "embedding_vector": None,
        "updated_at": firestore.SERVER_TIMESTAMP,
    })
    invalidate_cache(entry.university_id)
    return {"message": "Entry updated"}


@router.delete("/{entry_id}")
async def delete_knowledge(entry_id: str, university_id: str, _=Depends(require_admin)):
    """Delete a knowledge entry (admin only)."""
    db = get_db()
    db.collection("university_knowledge").document(entry_id).delete()
    invalidate_cache(university_id)
    return {"message": "Entry deleted"}
