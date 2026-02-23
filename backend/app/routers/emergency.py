"""
Emergency Router
=================
Returns verified emergency contacts and procedures.
Data is read from the 'emergency_contacts' Firestore collection,
scoped per university (university_id).

Categories: medical, hostel, fee, lost_id, exam
"""

from fastapi import APIRouter, HTTPException
from app.services.firebase import get_db

router = APIRouter()

# Hardcoded LPU emergency data as fallback while Firestore is being populated
LPU_EMERGENCY_FALLBACK = {
    "medical": {
        "title": "Medical Emergency",
        "icon": "🏥",
        "contacts": [
            {"name": "LPU Hospital", "phone": "01824-517000", "available": "24/7"},
            {"name": "Ambulance", "phone": "18001803838", "available": "24/7"},
        ],
        "location": "Block 32, LPU Campus",
        "steps": ["Call ambulance immediately", "Go to LPU Hospital Block 32", "Contact hostel warden"],
    },
    "hostel": {
        "title": "Hostel Issue",
        "icon": "🏠",
        "contacts": [
            {"name": "Hostel Helpdesk", "phone": "01824-404404", "available": "8AM–10PM"},
            {"name": "Chief Warden", "phone": "01824-517001", "available": "24/7"},
        ],
        "location": "Hostel Administrative Block",
        "steps": ["Contact floor warden", "Call central hostel helpdesk", "Escalate to Chief Warden if urgent"],
    },
    "fee": {
        "title": "Fee Deadline Issue",
        "icon": "💳",
        "contacts": [
            {"name": "Fee Counter", "phone": "01824-404777", "available": "9AM–5PM (Mon–Sat)"},
            {"name": "Finance Helpdesk", "phone": "01824-404778", "available": "9AM–5PM"},
        ],
        "location": "Admin Block, Ground Floor",
        "steps": ["Collect fee receipt / bank slip", "Visit fee counter with ID", "Request extension form if needed"],
    },
    "lost_id": {
        "title": "Lost ID Card",
        "icon": "🪪",
        "contacts": [
            {"name": "Smart Card Office", "phone": "01824-404500", "available": "9AM–5PM (Mon–Sat)"},
        ],
        "location": "Block 25, Ground Floor",
        "steps": ["Report loss to security office", "Fill duplicate ID form", "Pay ₹200 replacement fee", "Collect new ID within 3 working days"],
    },
    "exam": {
        "title": "Exam Emergency",
        "icon": "📝",
        "contacts": [
            {"name": "Exam Controller", "phone": "01824-404600", "available": "9AM–5PM"},
            {"name": "Dean Academics", "phone": "01824-404601", "available": "9AM–5PM"},
        ],
        "location": "UNI Block, 3rd Floor",
        "steps": ["Inform invigilator immediately", "Contact exam controller", "Submit medical certificate within 24 hours if applicable"],
    },
}


@router.get("/{university_slug}")
async def get_emergency_contacts(university_slug: str):
    """Return all emergency categories for a university."""
    db = get_db()
    docs = (
        db.collection("emergency_contacts")
        .where("university_id", "==", university_slug)
        .stream()
    )
    contacts = {doc.to_dict().get("category"): doc.to_dict() for doc in docs}

    # Fall back to hardcoded data for LPU if Firestore is empty
    if not contacts and university_slug == "lpu":
        contacts = LPU_EMERGENCY_FALLBACK

    return {"emergency": contacts}


@router.get("/{university_slug}/{category}")
async def get_emergency_category(university_slug: str, category: str):
    """Return a specific emergency category."""
    db = get_db()
    docs = (
        db.collection("emergency_contacts")
        .where("university_id", "==", university_slug)
        .where("category", "==", category)
        .stream()
    )
    results = [doc.to_dict() for doc in docs]

    if not results:
        if university_slug == "lpu" and category in LPU_EMERGENCY_FALLBACK:
            return {"emergency": LPU_EMERGENCY_FALLBACK[category]}
        raise HTTPException(404, "Emergency category not found")

    return {"emergency": results[0]}
