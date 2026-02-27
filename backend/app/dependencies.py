from fastapi import Depends, Header, HTTPException
from app.services.auth_service import get_current_user
from typing import Optional


async def get_token_from_header(
    authorization: Optional[str] = Header(None),
) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Authorization header missing or invalid")
    return authorization.split(" ", 1)[1]


async def get_user(token: str = Depends(get_token_from_header)):
    return await get_current_user(token)


async def require_admin(user=Depends(get_user)):
    if user.get("role") not in ("university_admin", "super_admin"):
        raise HTTPException(403, "Admin access required")
    return user


async def require_super_admin(user=Depends(get_user)):
    if user.get("role") != "super_admin":
        raise HTTPException(403, "Super admin access required")
    return user


def verify_university_access(user: dict, university_id: str):
    """Ensure university admin only accesses their assigned university."""
    if user.get("role") == "super_admin":
        return True
    if user.get("role") == "university_admin" and user.get("university_id") == university_id:
        return True
    raise HTTPException(403, "Access denied to this university's data")