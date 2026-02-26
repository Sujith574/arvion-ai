from fastapi import APIRouter, HTTPException, Request, BackgroundTasks
from slowapi import Limiter
from slowapi.util import get_remote_address
from pydantic import BaseModel, field_validator
from app.services.rag_service import RAGService
from app.services.firebase import get_university, log_query, store_feedback
from app.middleware.security import sanitize_input
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


class FeedbackRequest(BaseModel):
    query_id: str
    rating: int  # 1 for thumbs up, -1 for thumbs down
    university_slug: str
    comment: str | None = None

@router.post("/message")
@limiter.limit("20/minute")
async def chat_message(request: Request, body: ChatRequest, background_tasks: BackgroundTasks):
    university = await get_university(body.university_slug)
    if not university or not university.get("active", False):
        raise HTTPException(404, "University not found or inactive")

    rag = RAGService(university_id=body.university_slug)
    result = await rag.query(
        query=body.query,
        university_name=university.get("name", ""),
        confidence_threshold=university.get("confidence_threshold", 0.75),
        category_filter=body.category_filter,
        user_id=body.user_id or "anonymous",
    )

    query_id = str(uuid.uuid4())
    # Log query and store feedback asynchronously to improve response time
    background_tasks.add_task(log_query, {
        "id": query_id,
        "session_id": body.session_id or str(uuid.uuid4()),
        "university_id": body.university_slug,
        "user_id": body.user_id,
        "query": body.query,
        "response": result["answer"],
        "category": result.get("category"),
        "confidence_score": result["confidence"],
        "used_fallback_llm": result.get("used_fallback", False),
    })

    return {
        "query_id": query_id,
        "answer": result["answer"],
        "category": result.get("category"),
        "confidence": result["confidence"],
        "sources": result.get("sources", []),
        "used_fallback": result.get("used_fallback", False),
    }


@router.post("/feedback")
async def chat_feedback(body: FeedbackRequest, background_tasks: BackgroundTasks):
    """Store user feedback (thumbs up/down) for a specific query."""
    background_tasks.add_task(store_feedback, {
        "query_id": body.query_id,
        "rating": body.rating,
        "comment": body.comment,
        "university_id": body.university_slug,
    })
    return {"message": "Feedback received"}
