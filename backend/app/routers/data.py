"""
Data Upload Router (Admin-protected)
=====================================
POST   /api/data/upload/{university_slug}   — Upload & ingest data file (streaming, async)
GET    /api/data/files/{university_slug}    — List uploaded files
DELETE /api/data/entries/{university_slug}  — Delete all knowledge entries
POST   /api/data/reindex/{university_slug}  — Force re-index (bust cache)
"""

import asyncio
import logging
import os
import tempfile
from concurrent.futures import ThreadPoolExecutor

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from app.services.firebase import get_db
from app.services.rag_service import invalidate_cache
from app.services.data_ingestion import ingest_file
from app.dependencies import require_admin

logger = logging.getLogger(__name__)
router = APIRouter()

# Larger executor pool for concurrent uploads (e.g. 8 workers handles ~8 simultaneous large uploads)
_ingest_executor = ThreadPoolExecutor(max_workers=8)

# 10 GB limit
MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024
_CHUNK_SIZE = 4 * 1024 * 1024  # 4 MB read chunks (was 1 MB) — 4x faster streaming


@router.post("/upload/{university_slug}")
async def upload_data_file(
    university_slug: str,
    file: UploadFile = File(...),
    replace_existing: bool = Form(False),
    _=Depends(require_admin),
):
    """
    Upload data file (JSON / CSV / TXT / XLSX) for a university.
    Streams the file to a temp location so large files don't OOM.
    Parses and bulk-inserts knowledge entries into Firestore.
    """
    db = get_db()
    uni_doc = db.collection("universities").document(university_slug).get()
    if not uni_doc.exists:
        raise HTTPException(404, f"University '{university_slug}' not found. Create it first.")

    # ── Stream to temp file (handles large uploads without loading all into RAM) ──
    tmp_path = None
    try:
        suffix = os.path.splitext(file.filename or "upload")[1] or ".bin"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp_path = tmp.name
            total_bytes = 0
            chunk_size = 1024 * 1024  # 1 MB chunks

            while True:
                chunk = await file.read(_CHUNK_SIZE)
                if not chunk:
                    break
                total_bytes += len(chunk)
                if total_bytes > MAX_FILE_SIZE:
                    raise HTTPException(413, "File too large. Maximum 10 GB.")
                tmp.write(chunk)

        if total_bytes == 0:
            raise HTTPException(400, "Empty file uploaded.")

        logger.info(f"[Upload] Received {total_bytes:,} bytes for {university_slug} — '{file.filename}'")

        # ── Run ingest in thread pool (blocking I/O + CPU parsing) ──────────
        loop = asyncio.get_event_loop()

        def _run_ingest():
            return ingest_file(
                university_id=university_slug,
                filename=file.filename or "upload",
                file_path=tmp_path,
                replace_existing=replace_existing,
            )

        result = await loop.run_in_executor(_ingest_executor, _run_ingest)

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        logger.exception(f"[Upload] Error for {university_slug}: {e}")
        raise HTTPException(500, f"Upload failed: {e}")
    finally:
        # Always clean up temp file
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except Exception:
                pass

    return {
        "message": f"Successfully ingested {result['created']} knowledge entries from '{file.filename}'.",
        "created": result["created"],
        "skipped": result["skipped"],
        "university": university_slug,
        "filename": file.filename,
        "file_size_mb": round(total_bytes / 1024 / 1024, 2),
    }


@router.get("/files/{university_slug}")
async def list_data_files(university_slug: str, _=Depends(require_admin)):
    """Return uploaded files and knowledge entry count for a university."""
    db = get_db()
    uni_doc = db.collection("universities").document(university_slug).get()
    if not uni_doc.exists:
        raise HTTPException(404, "University not found")
    data = uni_doc.to_dict()

    # Optimized Count: Use select() to minimize data transfer
    loop = asyncio.get_event_loop()
    def _count():
        return len(list(db.collection("university_knowledge")
                       .where("university_id", "==", university_slug)
                       .select(["question"])  # Only fetch one field
                       .stream()))

    entries_count = await loop.run_in_executor(None, _count)

    return {
        "university": university_slug,
        "uploaded_files": data.get("uploaded_files", []),
        "total_knowledge_entries": entries_count,
    }


@router.delete("/entries/{university_slug}")
async def delete_all_entries(university_slug: str, _=Depends(require_admin)):
    """Delete ALL knowledge entries for a university (keeps the university profile)."""
    loop = asyncio.get_event_loop()

    def _do_delete():
        # Re-initialize db inside thread for safety
        db = get_db()
        col = db.collection("university_knowledge")
        
        # Synchronous fetch
        docs = list(col.where("university_id", "==", university_slug).select(["question"]).stream())
        if not docs:
            logger.warning(f"[Delete] No entries found for {university_slug}")
            return 0
            
        count = 0
        batch = db.batch()
        for doc in docs:
            batch.delete(doc.reference)
            count += 1
            if count % 400 == 0:
                batch.commit()
                batch = db.batch()
        
        if count % 400 != 0:
            batch.commit()
            
        # Clear file history in university profile
        db.collection("universities").document(university_slug).update({"uploaded_files": []})
        return count

    # Run blocking Firestore ops in executor
    count = await loop.run_in_executor(None, _do_delete)
    
    # Invalidate both in-memory and persistent vector caches
    invalidate_cache(university_slug)
    # Force bust university list cache so admin sees 0 immediately
    invalidate_universities_cache(university_slug)
    
    return {
        "message": f"Successfully deleted {count} knowledge entries for '{university_slug}'.",
        "count": count
    }


@router.post("/reindex/{university_slug}")
async def reindex(university_slug: str, _=Depends(require_admin)):
    """Force clear FAISS cache — next chat will re-index from Firestore."""
    invalidate_cache(university_slug)
    return {"message": f"FAISS cache cleared for '{university_slug}'. Next chat query will re-index."}
