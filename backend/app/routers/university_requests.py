from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from app.services.firebase import get_db
from firebase_admin import firestore
import uuid

router = APIRouter()


class UniversityRequestModel(BaseModel):
    university_name: str
    university_location: str
    requester_name: str
    requester_email: EmailStr
    requester_role: str = "student"  # student | parent | faculty | admin
    message: str = ""


@router.post("/request")
async def request_university(body: UniversityRequestModel):
    """Store a user request to onboard a new university."""
    if len(body.university_name.strip()) < 3:
        raise HTTPException(400, "University name must be at least 3 characters.")
    if len(body.requester_name.strip()) < 2:
        raise HTTPException(400, "Please provide your full name.")

    db = get_db()
    req_id = str(uuid.uuid4())

    db.collection("university_requests").document(req_id).set({
        "id": req_id,
        "university_name": body.university_name.strip(),
        "university_location": body.university_location.strip(),
        "requester_name": body.requester_name.strip(),
        "requester_email": body.requester_email,
        "requester_role": body.requester_role,
        "message": body.message.strip(),
        "status": "pending",
        "created_at": firestore.SERVER_TIMESTAMP,
    })

    return {
        "success": True,
        "message": f"Thank you! Your request for '{body.university_name}' has been received. Our team will review it shortly.",
        "request_id": req_id,
    }


@router.get("/requests")
async def list_requests():
    """Admin endpoint to list all university requests."""
    db = get_db()
    docs = db.collection("university_requests").order_by("created_at", direction=firestore.Query.DESCENDING).limit(100).get()
    return {"requests": [{"id": d.id, **d.to_dict()} for d in docs]}
