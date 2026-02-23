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
            {"name": "Reception Uni Hospital", "phone": "01824-444079 / 01824-501227", "available": "24/7"},
            {"name": "Resident Medical Officer", "phone": "98784-26880", "available": "On Call"},
            {"name": "Medical Officer", "phone": "98153-64977", "available": "On Call"},
            {"name": "Nursing Staff", "phone": "75081-82840 / 97800-36450", "available": "On Call"},
        ],
        "location": "Uni Hospital",
        "steps": ["Call Reception Uni Hospital ideally", "Contact Medical Officer if no answer", "Reach out to Nursing staff if others are unavailable"],
    },
    "security": {
        "title": "Security Emergency",
        "icon": "🛡️",
        "contacts": [
            {"name": "Emergency No.", "phone": "95018-10448 / 01824-444362", "available": "24/7"},
            {"name": "Chief Security Officer", "phone": "97800-05945 / 01824-444095", "available": "On Call"},
            {"name": "Senior Security Officer (Sec-1)", "phone": "98766-44331 / 01824-444365", "available": "On Call"},
            {"name": "Security Officer (Sec-2)", "phone": "98789-77600 / 01824-444272", "available": "On Call"},
            {"name": "Senior Security Officer (Sec-3)", "phone": "98784-26874 / 01824-444545", "available": "On Call"},
            {"name": "Senior Security Officer (Sec-4)", "phone": "98557-22332 / 01824-444070", "available": "On Call"},
        ],
        "location": "Main Security Office",
        "steps": ["Dial the 24/7 emergency number first", "Find the officer of your sector if needed"],
    },
    "fire": {
        "title": "Fire Department",
        "icon": "🔥",
        "contacts": [
            {"name": "Fire Tender", "phone": "75081-83870", "available": "24/7"},
            {"name": "Fire Officer", "phone": "97800-36430", "available": "On Call"},
            {"name": "Fire Office", "phone": "01824-444201", "available": "On Call"},
        ],
        "location": "Fire Office",
        "steps": ["Call Fire Tender immediately", "Evacuate the building safely"],
    },
    "anti_ragging": {
        "title": "Anti Ragging Helpline",
        "icon": "🚫",
        "contacts": [
            {"name": "Anti Ragging Helpline", "phone": "98766-44331", "available": "24/7"},
        ],
        "location": "Anti-Ragging Cell",
        "steps": ["Report immediately to the Anti Ragging Helpline", "Provide necessary details clearly"],
    },
    "dsr": {
        "title": "DSR (Divison of Student Relationship)",
        "icon": "🤝",
        "contacts": [
            {"name": "DSR Helpline", "phone": "75081-83870", "available": "Business Hours"},
        ],
        "location": "DSR Office",
        "steps": ["Contact DSR for relationship/dispute resolutions", "Ensure you have student ID handy"],
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
