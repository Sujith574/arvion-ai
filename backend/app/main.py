from fastapi import FastAPI, Response
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.routers import auth, chat, universities, admin, emergency, knowledge, data, university_requests, cms, files
from app.services.firebase import init_firebase, get_db
from app.middleware.security import SecurityMiddleware
from app.config import get_settings
import asyncio
import logging

logger = logging.getLogger(__name__)
init_firebase()
settings = get_settings()

def get_client_ip(request):
    """Custom key function to handle X-Forwarded-For correctly in production."""
    try:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            # User is usually the first IP in the list
            return forwarded.split(",")[0].strip()
        return get_remote_address(request)
    except Exception:
        return "127.0.0.1"

limiter = Limiter(key_func=get_client_ip)

app = FastAPI(
    title="Arvix AI API",
    version="1.0.0",
    docs_url="/api/docs" if not settings.IS_PROD else None,
    redoc_url=None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(GZipMiddleware, minimum_size=500)
app.add_middleware(SecurityMiddleware)

# Dedicated CORS handles everything from local to prod
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"GLOBAL ERROR: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
        headers={"Access-Control-Allow-Origin": "*"}
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
        from app.services.rag_service import get_embedding_model, RAGService
        # Warm up the heavy embedding model in a separate thread
        asyncio.get_event_loop().run_in_executor(None, get_embedding_model)
        
        # Proactively build the index for LPU so the first user gets an instant response
        # Using a background task so it doesn't block the actual server start
        async def warm_lpu():
            try:
                rag = RAGService("lpu")
                await rag.query("hi") 
                logger.info("[Startup] LPU Knowledge Base index warmed up")
            except: pass
            
        asyncio.create_task(warm_lpu())
        logger.info("[Startup] Background warmup tasks initiated")
    except Exception as e:
        logger.warning(f"[Startup] Warmup failed (non-fatal): {e}")

app.include_router(auth.router,           prefix="/api/auth",         tags=["Auth"])
app.include_router(chat.router,           prefix="/api/chat",         tags=["Chat"])
app.include_router(universities.router,   prefix="/api/universities", tags=["Universities"])
app.include_router(admin.router,          prefix="/api/admin",        tags=["Admin"])
app.include_router(emergency.router,      prefix="/api/emergency",    tags=["Emergency"])
app.include_router(knowledge.router,      prefix="/api/knowledge",    tags=["Knowledge"])
app.include_router(data.router,             prefix="/api/data",            tags=["Data"])
app.include_router(university_requests.router, prefix="/api/universities",  tags=["University Requests"])
app.include_router(cms.router, prefix="/api/cms", tags=["CMS"])
app.include_router(files.router, prefix="/api/files", tags=["Files"])


@app.api_route("/api/health", methods=["GET", "HEAD"])
async def health_check():
    return {
        "status": "ok",
        "service": "Arvix AI Assistant API",
        "ai": "proprietary_core",
        "rag": "faiss_local",
        "year": 2026,
    }
