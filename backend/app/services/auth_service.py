from app.services.firebase import get_db
from fastapi import HTTPException, status
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.config import get_settings
from datetime import datetime, timedelta

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(
            token, settings.JWT_SECRET_KEY, [settings.JWT_ALGORITHM]
        )
    except JWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")


async def get_current_user(token: str) -> dict:
    payload = decode_token(token)
    uid = payload.get("sub")
    if not uid:
        raise HTTPException(401, "Invalid token payload")
    db = get_db()
    doc = db.collection("users").document(uid).get()
    if not doc.exists:
        raise HTTPException(401, "User not found")
    return {"id": uid, **doc.to_dict()}