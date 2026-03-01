from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from app.services.firebase import get_db
from app.dependencies import require_admin
from firebase_admin import storage
from app.config import get_settings
import uuid
import datetime
import logging

logger = logging.getLogger(__name__)
router = APIRouter()
settings = get_settings()

@router.post("/upload")
async def upload_file(
    university_id: str,
    file: UploadFile = File(...),
    admin_data=Depends(require_admin)
):
    """Upload a file to Firebase Storage and return the public URL."""
    # check role and university access
    is_super = admin_data.get("role") == "super_admin"
    if not is_super and admin_data.get("university_id") != university_id:
        raise HTTPException(403, "Access denied")

    try:
        bucket = storage.bucket()
        # Create a unique filename
        file_extension = file.filename.split(".")[-1] if "." in file.filename else ""
        unique_filename = f"{university_id}/{uuid.uuid4()}.{file_extension}"
        blob = bucket.blob(unique_filename)
        
        # Upload file content
        content = await file.read()
        blob.upload_from_string(
            content,
            content_type=file.content_type
        )
        
        # Make it public (Optional, or use signed URLs)
        # Here we make it public for simplicity as requested "reflect instantly"
        blob.make_public()
        public_url = blob.public_url

        # Store metadata in Firestore
        db = get_db()
        file_info = {
            "university_id": university_id,
            "filename": file.filename,
            "storage_path": unique_filename,
            "url": public_url,
            "content_type": file.content_type,
            "size": len(content),
            "uploaded_by": admin_data["uid"],
            "created_at": datetime.datetime.utcnow().isoformat()
        }
        db.collection("university_files").add(file_info)

        return {"url": public_url, "filename": file.filename}
    except Exception as e:
        logger.error(f"File upload failed: {e}")
        raise HTTPException(500, f"Upload failed: {str(e)}")

@router.get("/{university_id}")
async def list_files(university_id: str, admin_data=Depends(require_admin)):
    """List all files for a university."""
    is_super = admin_data.get("role") == "super_admin"
    if not is_super and admin_data.get("university_id") != university_id:
        raise HTTPException(403, "Access denied")
        
    db = get_db()
    docs = db.collection("university_files").where("university_id", "==", university_id).stream()
    files = [{"id": d.id, **d.to_dict()} for d in docs]
    return {"files": files}

@router.delete("/{file_id}")
async def delete_file(file_id: str, admin_data=Depends(require_admin)):
    """Delete a file from Storage and Firestore."""
    db = get_db()
    file_ref = db.collection("university_files").document(file_id)
    doc = file_ref.get()
    
    if not doc.exists:
        raise HTTPException(404, "File not found")
        
    data = doc.to_dict()
    university_id = data.get("university_id")
    
    is_super = admin_data.get("role") == "super_admin"
    if not is_super and admin_data.get("university_id") != university_id:
        raise HTTPException(403, "Access denied")
        
    try:
        bucket = storage.bucket()
        blob = bucket.blob(data["storage_path"])
        blob.delete()
        file_ref.delete()
        return {"message": "File deleted"}
    except Exception as e:
        logger.error(f"File deletion failed: {e}")
        raise HTTPException(500, f"Deletion failed: {str(e)}")
