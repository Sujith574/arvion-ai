from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.routers import auth, chat, universities, admin, emergency, knowledge, data, university_requests
from app.services.firebase import init_firebase, get_db
from app.middleware.security import SecurityMiddleware
from app.config import get_settings
import asyncio
import logging

logger = logging.getLogger(__name__)
init_firebase()
settings = get_settings()

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="Arvix AI API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url=None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(GZipMiddleware, minimum_size=500)
app.add_middleware(SecurityMiddleware)

# CORS must be the absolute outermost middleware (added last in FastAPI)
# to ensure it handles preflight OPTIONS requests before any other logic.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



@app.on_event("startup")
async def startup_warmup():
    """Warm up Firestore connection and FAISS embedding model on startup."""
    try:
        db = get_db()
        # Warm Firestore connection pool with a lightweight ping
        list(db.collection("universities").limit(1).stream())
        logger.info("[Startup] Firestore connection warmed up")
    except Exception as e:
        logger.warning(f"[Startup] Firestore warmup failed (non-fatal): {e}")
    try:
        from app.services.rag_service import get_embedding_model
        asyncio.get_event_loop().run_in_executor(None, get_embedding_model)
        logger.info("[Startup] Embedding model loading triggered in background")
    except Exception as e:
        logger.warning(f"[Startup] Embedding model warmup failed (non-fatal): {e}")

app.include_router(auth.router,           prefix="/api/auth",         tags=["Auth"])
app.include_router(chat.router,           prefix="/api/chat",         tags=["Chat"])
app.include_router(universities.router,   prefix="/api/universities", tags=["Universities"])
app.include_router(admin.router,          prefix="/api/admin",        tags=["Admin"])
app.include_router(emergency.router,      prefix="/api/emergency",    tags=["Emergency"])
app.include_router(knowledge.router,      prefix="/api/knowledge",    tags=["Knowledge"])
app.include_router(data.router,             prefix="/api/data",            tags=["Data"])
app.include_router(university_requests.router, prefix="/api/universities",  tags=["University Requests"])


@app.api_route("/api/health", methods=["GET", "HEAD"])
async def health_check():
    return {
        "status": "ok",
        "service": "Arvix AI Assistant API",
        "ai": "proprietary_core",
        "rag": "faiss_local",
        "year": 2026,
    }
