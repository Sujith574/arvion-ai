from fastapi import APIRouter, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from pydantic import BaseModel, field_validator
from app.services.rag_service import RAGService
from app.services.firebase import get_university, log_query
from app.middleware.security import sanitize_input
from datetime import datetime
import uuid
import re

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


class ChatRequest(BaseModel):
    university_slug: str
    query: str
    session_id: str | None = None
    category_filter: str | None = None
    user_id: str | None = None  # Prolixis memory namespace; "anonymous" if not logged in

    @field_validator("query")
    @classmethod
    def validate_query(cls, v):
        v = v.strip()
        if len(v) < 1:
            raise ValueError("Query too short")
        if len(v) > 1000:
            raise ValueError("Query too long")
        injection_patterns = [
            r"ignore previous", r"system prompt",
            r"\n\n###", r"act as", r"jailbreak", r"DAN mode",
        ]
        for pattern in injection_patterns:
            if re.search(pattern, v, re.IGNORECASE):
                raise ValueError("Invalid query")
        return sanitize_input(v)


@router.post("/message")
@limiter.limit("20/minute")
async def chat_message(request: Request, body: ChatRequest):
    university = await get_university(body.university_slug)
    # `active` field is boolean True in our Firestore schema
    if not university or not university.get("active", False):
        raise HTTPException(404, "University not found or inactive")

    rag = RAGService(university_id=body.university_slug)
    result = await rag.query(
        query=body.query,
        university_name=university.get("name", ""),
        confidence_threshold=university.get("confidence_threshold", 0.75),
        category_filter=body.category_filter,
        user_id=body.user_id or "anonymous",   # Prolixis memory namespace
    )

    await log_query({
        "session_id": body.session_id or str(uuid.uuid4()),
        "university_id": body.university_slug,
        "user_id": body.user_id,
        "query": body.query,
        "response": result["answer"],
        "category": result.get("category"),
        "confidence_score": result["confidence"],
        "used_fallback_llm": result.get("used_fallback", False),
        "timestamp": datetime.utcnow().isoformat(),
    })

    return {
        "answer": result["answer"],
        "category": result.get("category"),
        "confidence": result["confidence"],
        "sources": result.get("sources", []),
        "used_fallback": result.get("used_fallback", False),
    }