#!/usr/bin/env python3
import sys
import os
from datetime import datetime
import firebase_admin
from firebase_admin import credentials, firestore

# Make sure the backend app package is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import get_settings

def init_firebase_manual():
    settings = get_settings()
    if not firebase_admin._apps:
        # Priority 1: Check for serviceAccountKey.json in backend root
        sa_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "serviceAccountKey.json")
        if os.path.exists(sa_path):
            cred = credentials.Certificate(sa_path)
            firebase_admin.initialize_app(cred)
            print(f"  🔑 Authenticated using: {sa_path}")
        else:
            # Priority 2: Use Application Default Credentials
            try:
                cred = credentials.ApplicationDefault()
                firebase_admin.initialize_app(cred, {"projectId": settings.FIREBASE_PROJECT_ID})
                print(f"  🔑 Authenticated using: Application Default Credentials")
            except Exception as e:
                print(f"  ❌ ERROR: Could not find Firebase credentials. Please ensure serviceAccountKey.json exists.")
                sys.exit(1)
    return firestore.client()

CAMPUS_CONTACTS = [
    # MEDICAL
    {
        "category": "emergency",
        "title": "Medical Helpline - University Hospital (24x7)",
        "content": "University Hospital Reception (24x7): 01824-444079, 01824-501227. Resident Medical Officer: 98784-26880. Medical Officer: 98153-64977. Nursing Staff: 75081-82840, 97800-36450.",
        "tags": ["medical", "emergency", "hospital", "doctor", "nursing", "ambulance"],
    },
    # SECURITY
    {
        "category": "emergency",
        "title": "Security Helpline - Emergency (24x7)",
        "content": "Security Emergency (24x7): 95018-10448, 01824-444362. Chief Security Officer: 97800-05945, 01824-444095.",
        "tags": ["security", "emergency", "safety", "police", "guard"],
    },
    {
        "category": "emergency",
        "title": "Security Sector Officers",
        "content": "Sector 1: 98766-44331, 01824-444365. Sector 2: 98789-77600, 01824-444272. Sector 3: 98784-26874, 01824-444545. Sector 4: 98557-22332, 01824-444070.",
        "tags": ["security", "sector", "officer", "patrol"],
    },
    # FIRE
    {
        "category": "emergency",
        "title": "Fire Department Helpline",
        "content": "Fire Tender (24x7): 75081-83870. Fire Officer: 97800-36430. Fire Office: 01824-444201.",
        "tags": ["fire", "emergency", "safety"],
    },
    # ANTI-RAGGING
    {
        "category": "emergency",
        "title": "Anti-Ragging Helpline",
        "content": "Anti-Ragging Helpline: 98766-44331. LPU maintains a zero-tolerance policy towards ragging.",
        "tags": ["anti-ragging", "safety", "helpline", "discipline"],
    },
    # DSR
    {
        "category": "general",
        "title": "Division of Student Relationship (DSR)",
        "content": "Division of Student Relationship (DSR) Helpline: +91 1824-520150. For student queries, grievances, and support.",
        "tags": ["dsr", "student relationship", "support", "grievance"],
    },
    # MAIN CONTACTS
    {
        "category": "admission",
        "title": "University Main Contact & Admissions",
        "content": "General / Admission Enquiry: +91 1824-517000. Alternate General Line: +91 1824-404404. WhatsApp Chat Support: +91 98525 69000.",
        "tags": ["admission", "enquiry", "whatsapp", "contact", "main"],
    },
    # ONLINE & DISTANCE
    {
        "category": "admission",
        "title": "Online & Distance Education Support",
        "content": "LPU Online Admissions: 01824-520001. LMS/Classes/Exam Support: 01824-520500. Delhi Office: 011-2370 9131. Distance Education Admissions: 01824-521350. General Enquiry: 01824-521360. Toll Free: 1800-3001-1800.",
        "tags": ["online", "distance education", "lms", "exam support", "toll free"],
    },
    # INTERNATIONAL
    {
        "category": "admission",
        "title": "International Office Contacts",
        "content": "International Admissions: +91 1824-444019. International WhatsApp Support: +91 95011 10413.",
        "tags": ["international", "foreign students", "admissions", "whatsapp"],
    },
    # CAREER / PLACEMENT
    {
        "category": "placements",
        "title": "Placement Cell & Career Services",
        "content": "Placement Cell (Career Services): +91 1824-444500. Career Services Mobile: +91 99150 20421. For recruitment and internship queries.",
        "tags": ["placement", "jobs", "career", "internship", "recruitment"],
    },
    {
        "category": "general",
        "title": "Alumni Association",
        "content": "LPU Alumni Association: +91 75081 83833. Connect with the global LPU alumni network.",
        "tags": ["alumni", "network", "graduates"],
    },
    # REGISTRAR
    {
        "category": "admin",
        "title": "Registrar Office Contact",
        "content": "Registrar (Official Contact): +91 99150 20408. Distance Education Bureau Listing (Landline): 01824-510274.",
        "tags": ["registrar", "official", "admin", "university"],
    },
    # ADDITIONAL
    {
        "category": "general",
        "title": "Phagwara (Chaheru Campus) Local Line",
        "content": "Local Campus Line (Chaheru, Phagwara): 01824-501201.",
        "tags": ["campus", "local", "phagwara", "chaheru"],
    },
]

def ingest_contacts():
    print(f"\n📞 Ingesting Campus Helpline Numbers for LPU...")
    db = init_firebase_manual()
    university_id = "lpu"
    added = 0
    updated = 0
    
    for entry in CAMPUS_CONTACTS:
        title = entry["title"]
        # Search for existing entry with same title and university
        existing_docs = list(db.collection("university_knowledge")
                            .where("university_id", "==", university_id)
                            .where("title", "==", title)
                            .limit(1).stream())
        
        entry_data = {
            "university_id": university_id,
            "category": entry["category"],
            "title": title,
            "content": entry["content"],
            "tags": entry["tags"],
            "verified": True,
            "source": "Campus Directory 2026",
            "updated_at": datetime.utcnow().isoformat()
        }
        
        if existing_docs:
            doc_id = existing_docs[0].id
            db.collection("university_knowledge").document(doc_id).update(entry_data)
            updated += 1
            print(f"  🔄 Updated: {title}")
        else:
            entry_data["created_at"] = datetime.utcnow().isoformat()
            db.collection("university_knowledge").add(entry_data)
            added += 1
            print(f"  ✅ Added: {title}")
            
    print(f"\nDone! Added {added}, Updated {updated} contacts.")

if __name__ == "__main__":
    ingest_contacts()
