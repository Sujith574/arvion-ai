#!/usr/bin/env python3
"""
Arvion AI — Firestore Seed Script
===================================
Run ONCE after Firebase is configured to populate all required collections.

Usage:
    cd c:\\Users\\sujit\\arvion-ai\\backend
    python scripts/seed_firestore.py

What it creates:
  - universities/lpu          : LPU university profile
  - university_knowledge/*    : 15 verified knowledge base entries for LPU
  - users/<admin-uid>         : Super-admin user (login: admin@arvion.ai / Admin@1234)
"""

import sys
import os
import uuid
from datetime import datetime

# Make sure the backend app package is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.firebase import init_firebase, get_db
from app.services.auth_service import hash_password

# ── Bootstrap Firebase ───────────────────────────────────────────
init_firebase()
db = get_db()

print("\n🔥 Izra AI — Firestore Seeder")
print("=" * 50)

# ── 1. Universities ──────────────────────────────────────────────
print("\n📍 Seeding universities...")

universities = {
    "lpu": {
        "id": "lpu",
        "slug": "lpu",
        "name": "Lovely Professional University",
        "short_name": "LPU",
        "location": "Phagwara, Punjab — NH-1",
        "state": "Punjab",
        "country": "India",
        "pincode": "144411",
        "description": (
            "India's largest private university, autonomous since 2018, with 30,000+ students "
            "across 200+ programs in Engineering, Management, Law, Agriculture, Design, and more. "
            "NAAC A+ accredited with a vibrant international community."
        ),
        "established": "2005",
        "students_count": "30,000+",
        "programs_count": "200+",
        "accreditation": "NAAC A+",
        "autonomous": True,
        "active": True,
        "website": "https://www.lpu.in",
        "email": "admissions@lpu.in",
        "phone": "01824-404404",
        "emergency_phone": "01824-517000",
        "logo_url": "",
        "cover_url": "",
        "social": {
            "instagram": "https://www.instagram.com/lovelyprofessionaluniversity",
            "facebook": "https://www.facebook.com/LPULovelyProfessionalUniversity",
            "twitter": "https://twitter.com/LPU_Official",
            "youtube": "https://www.youtube.com/user/lpuofficial",
        },
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }
}

for slug, data in universities.items():
    db.collection("universities").document(slug).set(data)
    print(f"  ✅ universities/{slug}")

# ── 2. Knowledge Base ────────────────────────────────────────────
print("\n📚 Seeding university_knowledge (LPU)...")

knowledge_entries = [
    # Admission
    {
        "university_id": "lpu",
        "category": "admission",
        "title": "B.Tech Admission Process",
        "content": (
            "LPU B.Tech admissions are based on LPUNEST scores, JEE Main scores, or Class 12 marks. "
            "Eligibility: 60%+ in Physics, Chemistry, and Mathematics in Class 12. "
            "Apply online at lpu.in → Admissions. Documents required: Class 10 & 12 marksheets, "
            "ID proof, and passport-sized photographs. Admission helpline: 01824-404404."
        ),
        "tags": ["btech", "admission", "engineering", "lpunest", "jee"],
        "verified": True,
        "source": "official_website",
    },
    {
        "university_id": "lpu",
        "category": "admission",
        "title": "LPUNEST Scholarship Exam",
        "content": (
            "LPUNEST (LPU National Entrance and Scholarship Test) is conducted online. "
            "Top scorers get up to 100% tuition fee waiver. The test covers aptitude, English, "
            "and subject-specific questions. Register at lpu.in/lpunest. "
            "The exam is conducted in multiple rounds throughout the year."
        ),
        "tags": ["lpunest", "scholarship", "entrance", "exam"],
        "verified": True,
        "source": "official_website",
    },
    # Fees
    {
        "university_id": "lpu",
        "category": "fees",
        "title": "B.Tech Fee Structure",
        "content": (
            "B.Tech tuition fee at LPU: CSE/IT — approximately ₹1,60,000 per year. "
            "Mechanical/Civil/Electrical — approximately ₹1,25,000 per year. "
            "Fees may vary by specialization and scholarship. One-time registration fee: ₹5,000. "
            "Fee can be paid via online banking, demand draft, or EMI options available."
        ),
        "tags": ["fees", "btech", "tuition", "cse", "emi"],
        "verified": True,
        "source": "fee_structure_2024",
    },
    {
        "university_id": "lpu",
        "category": "fees",
        "title": "MBA Fee Structure",
        "content": (
            "MBA at LPU: Annual fee approximately ₹1,40,000–₹1,80,000 depending on specialization. "
            "Specializations: Marketing, Finance, HR, Operations, International Business. "
            "PGDM is also available. Scholarship available via LPUNEST/CAT/MAT scores."
        ),
        "tags": ["fees", "mba", "management", "pgdm"],
        "verified": True,
        "source": "fee_structure_2024",
    },
    # Hostel
    {
        "university_id": "lpu",
        "category": "hostel",
        "title": "Hostel Facilities and Fee",
        "content": (
            "LPU offers on-campus hostels for boys, girls, and international students. "
            "Non-AC room: ₹65,000–₹75,000 per year (includes meals). "
            "AC room (single/double): ₹90,000–₹1,10,000 per year (includes meals). "
            "Facilities: Wi-Fi, 24/7 security, gym, recreation room, laundry. "
            "To apply: lpu.in → Student Services → Hostel Booking."
        ),
        "tags": ["hostel", "accommodation", "fees", "ac", "non-ac"],
        "verified": True,
        "source": "hostel_brochure_2024",
    },
    {
        "university_id": "lpu",
        "category": "hostel",
        "title": "Hostel Rules and Contact",
        "content": (
            "Hostel entry timings: Boys — 10:30 PM, Girls — 9:30 PM. "
            "Visitors allowed only in designated areas. Mobile usage free. "
            "Hostel helpdesk: 01824-404404. Chief Warden: 01824-517001. "
            "Warden is available in each block 24/7 for emergencies."
        ),
        "tags": ["hostel", "rules", "timings", "warden", "contact"],
        "verified": True,
        "source": "hostel_manual",
    },
    # Exams
    {
        "university_id": "lpu",
        "category": "exams",
        "title": "Term End Examination Pattern",
        "content": (
            "LPU follows a semester system with Term End Exams (TEE) at the end of each semester. "
            "Exam schedule is released on the LPU portal (ums.lpu.in) approximately 2 weeks before exams. "
            "Minimum 75% attendance required to sit in exams. "
            "Results are declared within 30 days on the UMS portal."
        ),
        "tags": ["exams", "tee", "semester", "results", "attendance"],
        "verified": True,
        "source": "academic_policy",
    },
    {
        "university_id": "lpu",
        "category": "exams",
        "title": "Re-examination / Back Paper",
        "content": (
            "Students who fail or miss the Term End Exam can appear in the Supplementary Exam "
            "held approximately 2 months after the main exam. "
            "Re-exam registration is done through the UMS portal. Fee: ₹500 per subject. "
            "A maximum of 3 attempts are allowed per subject."
        ),
        "tags": ["back paper", "re-exam", "supplementary", "fail"],
        "verified": True,
        "source": "academic_policy",
    },
    # Scholarships
    {
        "university_id": "lpu",
        "category": "scholarships",
        "title": "Merit-Based Scholarships",
        "content": (
            "LPU offers scholarships based on LPUNEST score, JEE/NEET/CAT rank, and Class 12 marks. "
            "Scholarship slabs: \n"
            "- LPUNEST Rank 1–10: 100% tuition waiver\n"
            "- LPUNEST Rank 11–50: 75% tuition waiver\n"
            "- Class 12 with 95%+: 50% tuition waiver\n"
            "- Class 12 with 90–94%: 25% tuition waiver\n"
            "Scholarship is renewable each year based on CGPA (≥8.0 required)."
        ),
        "tags": ["scholarship", "merit", "lpunest", "tuition waiver", "cgpa"],
        "verified": True,
        "source": "scholarship_brochure_2024",
    },
    {
        "university_id": "lpu",
        "category": "scholarships",
        "title": "Sports and Cultural Scholarships",
        "content": (
            "LPU offers 100% scholarship for national/international sports persons and cultural achievers. "
            "Eligible sports: Cricket, Football, Basketball, Athletics, Chess, etc. "
            "Submit proof (certificate/medal) at the time of admission. "
            "Contact: sportsdivision@lpu.in or 01824-999999."
        ),
        "tags": ["scholarship", "sports", "cultural", "100%"],
        "verified": True,
        "source": "scholarship_brochure_2024",
    },
    # Emergency
    {
        "university_id": "lpu",
        "category": "emergency",
        "title": "Medical Emergency on Campus",
        "content": (
            "LPU has a 24/7 hospital on campus (Block 32). "
            "In case of medical emergency: Call LPU Hospital: 01824-517000. "
            "Ambulance service available free of cost for LPU students. "
            "Ambulance number: 18001803838. "
            "For mental health support, contact the Student Wellness Center in Block 38."
        ),
        "tags": ["emergency", "medical", "hospital", "ambulance"],
        "verified": True,
        "source": "campus_guide",
    },
    {
        "university_id": "lpu",
        "category": "emergency",
        "title": "Lost ID Card Procedure",
        "content": (
            "If you lose your Smart Card (ID card): \n"
            "1. Report to the nearest Security Office immediately\n"
            "2. Visit Smart Card Office (Block 25, Ground Floor) with ID proof\n"
            "3. Fill the Duplicate ID form\n"
            "4. Pay ₹200 replacement fee at the fee counter\n"
            "5. Collect new card within 3 working days\n"
            "Smart Card Office hours: 9AM–5PM (Monday to Saturday)."
        ),
        "tags": ["lost id", "smart card", "id card", "emergency"],
        "verified": True,
        "source": "student_handbook",
    },
    # General
    {
        "university_id": "lpu",
        "category": "general",
        "title": "Campus Facilities Overview",
        "content": (
            "LPU campus is spread over 600 acres with world-class facilities: "
            "8000+ seat amphitheatre, Olympic-size swimming pool, 50+ sports grounds, "
            "200+ labs, 4 food courts, shopping complex, ATMs, post office, and bank branches. "
            "High-speed Wi-Fi covers the entire campus. "
            "Library stocks 3 lakh+ books and digital resources."
        ),
        "tags": ["campus", "facilities", "infrastructure", "sports", "library"],
        "verified": True,
        "source": "campus_guide",
    },
    {
        "university_id": "lpu",
        "category": "general",
        "title": "Student Helpdesk and Grievance",
        "content": (
            "For any grievance or query: Visit the Student Helpdesk in the UNI Block (Ground Floor). "
            "Online: ums.lpu.in → Grievance Portal. "
            "Helpdesk: 01824-517000 (8AM–8PM, all days). "
            "Dean Student Welfare email: dsw@lpu.in. "
            "Academic grievance: Contact your School Dean or Academic Coordinator."
        ),
        "tags": ["helpdesk", "grievance", "student welfare", "contact"],
        "verified": True,
        "source": "student_handbook",
    },
    {
        "university_id": "lpu",
        "category": "general",
        "title": "UMS Portal Guide",
        "content": (
            "UMS (University Management System) at ums.lpu.in is the one-stop portal for students. "
            "Features: attendance tracking, exam schedule, fee payment, result checking, "
            "hostel booking, course registration, and grievance submission. "
            "Login with your LPU registration number and date of birth (first login). "
            "For UMS login issues: Call IT helpdesk at 01824-517002."
        ),
        "tags": ["ums", "portal", "lpu.in", "attendance", "results"],
        "verified": True,
        "source": "ums_guide",
    },
]

added = 0
for entry in knowledge_entries:
    doc_ref = db.collection("university_knowledge").document()
    entry["id"] = doc_ref.id
    entry["created_at"] = datetime.utcnow().isoformat()
    entry["updated_at"] = datetime.utcnow().isoformat()
    doc_ref.set(entry)
    added += 1
    print(f"  ✅ [{entry['category']}] {entry['title'][:60]}")

print(f"\n  → {added} knowledge entries seeded")

# ── 3. Admin User ────────────────────────────────────────────────
print("\n👤 Creating super-admin user...")

ADMIN_EMAIL = "admin@izra.ai"
ADMIN_PASSWORD = "Admin@1234"
ADMIN_NAME = "Izra Super Admin"

# Check if admin already exists
existing = list(db.collection("users").where("email", "==", ADMIN_EMAIL).get())
if existing:
    print(f"  ℹ️  Admin user ({ADMIN_EMAIL}) already exists — skipping.")
else:
    admin_uid = str(uuid.uuid4())
    db.collection("users").document(admin_uid).set({
        "email": ADMIN_EMAIL,
        "display_name": ADMIN_NAME,
        "hashed_password": hash_password(ADMIN_PASSWORD),
        "role": "super_admin",
        "university_id": "lpu",
        "bookmarks": [],
        "created_at": datetime.utcnow().isoformat(),
    })
    print(f"  ✅ Admin user created")
    print(f"     Email:    {ADMIN_EMAIL}")
    print(f"     Password: {ADMIN_PASSWORD}")
    print(f"     UID:      {admin_uid}")
    print(f"\n  ⚠️  Change the admin password after first login!")

# ── Done ─────────────────────────────────────────────────────────
print("\n" + "=" * 50)
print("✅ Firestore seeding complete!")
print("\nNext steps:")
print("  1. Start backend:  uvicorn app.main:app --reload")
print("  2. Open:          http://localhost:8000/api/docs")
print("  3. Admin login:    http://localhost:3000/auth/login")
print(f"                    Email: {ADMIN_EMAIL} / Pass: {ADMIN_PASSWORD}")
print("=" * 50 + "\n")
