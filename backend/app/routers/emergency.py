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
            {"name": "Uni Hospital (24x7 Reception)", "phone": "01824-444079 / 01824-501227", "available": "24/7"},
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
            {"name": "Emergency (24x7)", "phone": "95018-10448 / 01824-444362", "available": "24/7"},
            {"name": "Chief Security Officer", "phone": "97800-05945 / 01824-444095", "available": "On Call"},
            {"name": "Senior Security Officer (Sector 1)", "phone": "98766-44331 / 01824-444365", "available": "On Call"},
            {"name": "Security Officer (Sector 2)", "phone": "98789-77600 / 01824-444272", "available": "On Call"},
            {"name": "Senior Security Officer (Sector 3)", "phone": "98784-26874 / 01824-444545", "available": "On Call"},
            {"name": "Senior Security Officer (Sector 4)", "phone": "98557-22332 / 01824-444070", "available": "On Call"},
        ],
        "location": "Main Security Office",
        "steps": ["Dial the 24/7 emergency number first", "Find the officer of your sector if needed"],
    },
    "fire": {
        "title": "Fire Department",
        "icon": "🔥",
        "contacts": [
            {"name": "Fire Tender (24x7)", "phone": "75081-83870", "available": "24/7"},
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
            {"name": "Anti-Ragging Helpline", "phone": "98766-44331", "available": "24/7"},
        ],
        "location": "Anti-Ragging Cell",
        "steps": ["Report immediately to the Anti Ragging Helpline", "Provide necessary details clearly"],
    },
    "dsr": {
        "title": "DSR (Division of Student Relationship)",
        "icon": "🤝",
        "contacts": [
            {"name": "DSR Helpline", "phone": "+91 1824-520150", "available": "Business Hours"},
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
    "main_contacts": {
        "title": "University Main Contacts",
        "icon": "🏛️",
        "contacts": [
            {"name": "General / Admission Enquiry", "phone": "+91 1824-517000", "available": "9AM-6PM"},
            {"name": "Alternate General Line", "phone": "+91 1824-404404", "available": "9AM-6PM"},
            {"name": "WhatsApp Chat Support", "phone": "+91 98525 69000", "available": "24/7"},
        ],
        "location": "Admin Block",
        "steps": ["Call for general admission or campus enquiries", "Use WhatsApp for quick chat support"],
    },
    "online_education": {
        "title": "LPU Online & Distance Education",
        "icon": "📚",
        "contacts": [
            {"name": "LPU Online Admissions", "phone": "01824-520001", "available": "9AM-6PM"},
            {"name": "LMS / Classes / Exam Support", "phone": "01824-520500", "available": "9AM-6PM"},
            {"name": "Distance Education Admission", "phone": "01824-521350", "available": "9AM-6PM"},
            {"name": "Distance Toll Free", "phone": "1800-3001-1800", "available": "9AM-6PM"},
        ],
        "location": "LPU Online Block",
        "steps": ["Call Admissions for new enrollment", "Call LMS support for class/exam issues"],
    },
    "international": {
        "title": "International Office",
        "icon": "🌍",
        "contacts": [
            {"name": "International Admissions", "phone": "+91 1824-444019", "available": "9AM-6PM"},
            {"name": "International WhatsApp", "phone": "+91 95011 10413", "available": "24/7"},
        ],
        "location": "International Division Block",
        "steps": ["Global students can contact here for visa/admission info"],
    },
    "career": {
        "title": "Career & Alumni Association",
        "icon": "💼",
        "contacts": [
            {"name": "Placement Cell (Career Services)", "phone": "+91 1824-444500", "available": "9AM-6PM"},
            {"name": "Placement Cell (Mobile)", "phone": "+91 99150 20421", "available": "9AM-6PM"},
            {"name": "Alumni Association", "phone": "+91 75081 83833", "available": "9AM-6PM"},
        ],
        "location": "Division of Career Services",
        "steps": ["Contact for placement support or alum queries"],
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
