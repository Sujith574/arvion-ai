import os
import sys

# Ensure backend root is in PYTHONPATH
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.auth_service import hash_password
from app.services.firebase import init_firebase, get_db
from firebase_admin import firestore

def init_super_admin():
    init_firebase()
    db = get_db()
    
    email = "startupai241094@gmail.com"
    # Using a secure random default password, since user will use "reset password"
    import secrets
    import string
    alphabet = string.ascii_letters + string.digits + string.punctuation
    default_password = ''.join(secrets.choice(alphabet) for i in range(20))
    
    hashed = hash_password(default_password)
    
    user_ref = db.collection("users").document(email)
    user_doc = user_ref.get()
    
    if not user_doc.exists:
        user_data = {
            "email": email,
            "password_hash": hashed,
            "role": "super_admin",
            "display_name": "Arvix Super Admin",
            "is_active": True,
            "created_at": firestore.SERVER_TIMESTAMP,
            "updated_at": firestore.SERVER_TIMESTAMP
        }
        user_ref.set(user_data)
        print(f"Super Admin initialized: {email}")
        print("Password was randomly generated. Use 'Reset Password' to set your own.")
    else:
        # Ensure role is super_admin
        current_data = user_doc.to_dict()
        if current_data.get("role") != "super_admin":
            user_ref.update({"role": "super_admin", "is_active": True})
            print(f"User {email} updated to super_admin role and activated.")
        else:
            print(f"Super Admin {email} already exists.")

if __name__ == "__main__":
    init_super_admin()
