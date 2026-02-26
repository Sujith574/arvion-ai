from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from app.services.auth_service import hash_password, verify_password, create_access_token
from app.services.firebase import get_db
from app.services.email_service import send_otp_email, generate_otp
from app.dependencies import get_user
from firebase_admin import firestore
import uuid
import asyncio
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone

router = APIRouter()
_pool = ThreadPoolExecutor(max_workers=20)


# ── Models ─────────────────────────────────────────────────────────────────

class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    display_name: str
    university_id: str | None = None
    role: str = "student"
    otp_token: str  # Required — verified OTP token from /verify-otp


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class SendOtpRequest(BaseModel):
    email: EmailStr
    purpose: str = "signup"  # "signup" | "reset"


class VerifyOtpRequest(BaseModel):
    email: EmailStr
    otp: str
    purpose: str = "signup"


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    new_password: str
    otp_token: str  # Required — verified OTP token from /verify-otp


# ── OTP Helper ──────────────────────────────────────────────────────────────

def _check_verified_token(db, email: str, purpose: str, token: str):
    """Validate a verified OTP token stored in Firestore."""
    key = f"{email}::{purpose}"
    ref = db.collection("otp_verified").document(key)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(400, "OTP verification required. Please verify your email first.")
    data = doc.to_dict()
    if data.get("token") != token:
        raise HTTPException(400, "Invalid verification token.")
    expires_at = data.get("expires_at")
    if expires_at and datetime.now(timezone.utc) > expires_at:
        ref.delete()
        raise HTTPException(400, "Verification token expired. Please request a new OTP.")
    ref.delete()  # one-time use


# ── Endpoints ───────────────────────────────────────────────────────────────

@router.post("/send-otp")
async def send_otp(body: SendOtpRequest):
    """Send a 6-digit OTP to the given email for signup or password reset."""
    db = get_db()

    if body.purpose == "signup":
        existing = list(db.collection("users").where("email", "==", body.email).get())
        if existing:
            raise HTTPException(400, "Email already registered. Please login instead.")

    if body.purpose == "reset":
        users = list(db.collection("users").where("email", "==", body.email).get())
        if not users:
            # Silently succeed to prevent email enumeration
            return {"message": "If an account exists, an OTP has been sent."}

    otp = generate_otp()
    key = f"{body.email}::{body.purpose}"
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

    db.collection("otp_codes").document(key).set({
        "email": body.email,
        "otp": otp,
        "purpose": body.purpose,
        "expires_at": expires_at,
        "created_at": firestore.SERVER_TIMESTAMP,
    })

    sent = send_otp_email(body.email, otp, body.purpose)
    if not sent:
        raise HTTPException(500, "Failed to send OTP email. Please try again.")

    return {"message": f"OTP sent to {body.email}. Valid for 10 minutes."}


@router.post("/verify-otp")
async def verify_otp(body: VerifyOtpRequest):
    """Verify an OTP. Returns a verified_token to be used in signup/reset."""
    db = get_db()
    key = f"{body.email}::{body.purpose}"
    doc_ref = db.collection("otp_codes").document(key)
    doc = doc_ref.get()

    if not doc.exists:
        raise HTTPException(400, "OTP not found or already used. Please request a new one.")

    data = doc.to_dict()
    expires_at = data.get("expires_at")
    if expires_at and datetime.now(timezone.utc) > expires_at:
        doc_ref.delete()
        raise HTTPException(400, "OTP has expired. Please request a new one.")

    if data.get("otp") != body.otp.strip():
        raise HTTPException(400, "Incorrect OTP. Please try again.")

    doc_ref.delete()

    # Store a short-lived verified token so the next step can confirm OTP was done
    verified_token = str(uuid.uuid4())
    verified_key = f"{body.email}::{body.purpose}"
    db.collection("otp_verified").document(verified_key).set({
        "email": body.email,
        "token": verified_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=15),
    })

    return {"verified": True, "verified_token": verified_token, "email": body.email}


@router.post("/signup")
async def signup(body: SignupRequest):
    if len(body.password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")

    db = get_db()
    _check_verified_token(db, body.email, "signup", body.otp_token)

    existing = list(db.collection("users").where("email", "==", body.email).get())
    if existing:
        raise HTTPException(400, "Email already registered")

    uid = str(uuid.uuid4())
    valid_roles = ["student", "parent", "university_admin"]
    role = body.role if body.role in valid_roles else "student"

    db.collection("users").document(uid).set({
        "email": body.email,
        "display_name": body.display_name,
        "hashed_password": hash_password(body.password),
        "role": role,
        "university_id": body.university_id,
        "bookmarks": [],
        "email_verified": True,
        "created_at": firestore.SERVER_TIMESTAMP,
    })

    token = create_access_token({"sub": uid, "role": role})
    return {"access_token": token, "token_type": "bearer", "role": role}


@router.post("/token")
async def login(body: LoginRequest):
    loop = asyncio.get_event_loop()
    db = get_db()

    # Firestore query (I/O bound)
    users = await loop.run_in_executor(_pool, lambda: list(
        db.collection("users").where("email", "==", body.email).get()
    ))
    if not users:
        raise HTTPException(401, "Invalid credentials")

    user_doc = users[0]
    user = user_doc.to_dict()

    # bcrypt verify is CPU-bound — run in thread so we don't block the event loop
    hashed = user.get("hashed_password", "")
    ok = await loop.run_in_executor(_pool, lambda: verify_password(body.password, hashed))
    if not ok:
        raise HTTPException(401, "Invalid credentials")

    token = create_access_token({"sub": user_doc.id, "role": user["role"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user["role"],
        "university_id": user.get("university_id"),
        "display_name": user.get("display_name"),
    }


@router.post("/reset-password")
async def reset_password(body: ResetPasswordRequest):
    if len(body.new_password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")

    db = get_db()
    _check_verified_token(db, body.email, "reset", body.otp_token)

    users = list(db.collection("users").where("email", "==", body.email).get())
    if not users:
        return {"message": "If an account with that email exists, the password has been updated."}

    user_doc = users[0]
    user_doc.reference.update({
        "hashed_password": hash_password(body.new_password),
        "updated_at": firestore.SERVER_TIMESTAMP,
    })

    return {"message": "Password reset successfully. You can now login with your new password."}
    

@router.delete("/me")
async def delete_me(user: dict = Depends(get_user)):
    """Permanently delete the logged-in user's account."""
    db = get_db()
    
    # Delete the user document
    db.collection("users").document(user["id"]).delete()
    
    # Optional: Log the deletion
    print(f"[Auth] User deleted account: {user['email']} (ID: {user['id']})")
    
    return {"message": "Account deleted successfully. We're sorry to see you go."}