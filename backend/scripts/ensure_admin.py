import sys
import os
import uuid
from datetime import datetime

# Make sure the backend app package is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.firebase import init_firebase, get_db
from app.services.auth_service import hash_password

init_firebase()
db = get_db()

email = "testadmin@lpu.co.in"
password = "SecureAdmin789!"
name = "Test Admin"

# Check if exists
existing = list(db.collection("users").where("email", "==", email).get())
if existing:
    # Update password just in case
    doc_id = existing[0].id
    db.collection("users").document(doc_id).update({
        "hashed_password": hash_password(password),
        "role": "super_admin",
        "university_id": "lpu"
    })
    print(f"Updated existing user {email}")
else:
    uid = str(uuid.uuid4())
    db.collection("users").document(uid).set({
        "email": email,
        "display_name": name,
        "hashed_password": hash_password(password),
        "role": "super_admin",
        "university_id": "lpu",
        "bookmarks": [],
        "created_at": datetime.utcnow().isoformat(),
    })
    print(f"Created new admin user {email}")
