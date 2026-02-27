from app.services.auth_service import hash_password
from app.services.firebase import init_firebase, get_db
from firebase_admin import firestore
import sys
import os

# Add current directory to path if needed
sys.path.append(os.getcwd())

def create_admin():
    init_firebase()
    db = get_db()
    email = "admin_test@arvix.ai"
    password = "AdminPassword123!"
    hashed = hash_password(password)
    
    user_ref = db.collection("users").document(email)
    user_data = {
        "email": email,
        "password_hash": hashed,
        "role": "admin",
        "display_name": "Test Admin",
        "is_active": True,
        "created_at": firestore.SERVER_TIMESTAMP,
        "updated_at": firestore.SERVER_TIMESTAMP
    }
    
    user_ref.set(user_data)
    print(f"Admin user {email} created/updated with password: {password}")

if __name__ == "__main__":
    create_admin()
