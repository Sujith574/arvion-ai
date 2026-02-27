"""
RAG Service — Retrieval-Augmented Generation (Architected for Scale)
====================================================================
This service orchestrates the RAG flow:
1. Memory retrieval (Prolixis)
2. Greeting/Conversational detection
3. Identity/Meta query detection
4. Hybrid Vector Search (via BaseVectorStore abstraction)
5. AI Synthesis (using Master System Prompt)
6. Interaction logging & Memory storage
"""

import logging
import asyncio
import re
from functools import lru_cache
from concurrent.futures import ThreadPoolExecutor
import numpy as np
from sentence_transformers import SentenceTransformer

from app.config import get_settings
from app.services.llm_service import generate_response
from app.services.prolixis_service import search_memories, store_memory, build_memory_context
from app.services.firebase import get_knowledge_base
from app.services.vector_store import get_vector_store
from app.services.semantic_cache import get_semantic_cache

logger = logging.getLogger(__name__)
settings = get_settings()

# Thread pool for non-blocking side effects
_executor = ThreadPoolExecutor(max_workers=4)

# ── Conversational / Greeting detection ───────────────────────────────────
_GREETING_RE = re.compile(
    r"^(hi+|hello+|hey+|greetings?|howdy|good\s*(morning|afternoon|evening|night)|"
    r"what'?s?\s*up|namaste|namaskar|hii+|heyy+|hai+|yo+|sup|"
    r"how are you|how r u|how do you do|nice to meet you|pleased to meet you)\W*$",
    re.IGNORECASE,
)

_SMALL_TALK_RE = re.compile(
    r"^(thanks?|thank\s*you|ty|thx|okay|ok|got it|got\s*it|cool|great|awesome|"
    r"nice|perfect|sure|sounds good|alright|bye|goodbye|see\s*you|later|"
    r"you('re| are) (great|amazing|helpful|good)|well done|good job)\W*$",
    re.IGNORECASE,
)

_IDENTITY_RE = re.compile(
    r"("
    r"how\s*(are|were|was|did|do)\s*(you|u)\s*(train(ed|ing)?|made|built|creat|develop|work|function|learn|know|operat)"
    r"|who\s*(made|built|creat|develop|train)\s*(you|u)"
    r"|what\s*(are|is)\s*(you|ur|your|this)\s*(ai|bot|assistant|model|system|platform|app)"
    r"|(are|r)\s*(you|u)\s*(an?\s*)?(ai|bot|robot|assistant|human|real)"
    r"|(who|what)\s*(is|are)\s*(arvix\s*ai|you|ur)"
    r"|(tell|explain|describe)\s*(me\s*)?(about\s*)?(yourself|you|your\s*self)"
    r"|how\s*(does|do)\s*(you|this|arvix\s*ai)\s*work"
    r"|what\s*can\s*(you|u)\s*do"
    r"|(are|r)\s*(you|u)\s*(powered|run|based|built)\s*(by|on|with)"
    r"|your\s*(purpose|goal|function|role|job|mission)"
    r")",
    re.IGNORECASE,
)

_INFO_KEYWORDS_RE = re.compile(
    r"\b(address|location|fee|fees|hostel|admission|apply|course|placement|salary|"
    r"campus|contact|phone|email|website|rank|rating|exam|scholarship|seat|intake|"
    r"branch|department|faculty|cutoff|eligibility|how to|when|where|what|which|who|why|"
    r"timing|schedule|date|deadline|form|document|process|procedure|facility|transport|"
    r"result|certificate|mark|grade|rule|policy|refund|transfer|lateral|form|portal|"
    r"vs|versus|better|compare|comparison|difference|advantage|disadvantage)\b",
    re.IGNORECASE,
)

def _is_conversational(text: str) -> bool:
    t = text.strip()
    if _INFO_KEYWORDS_RE.search(t):
        return False
    return bool(_GREETING_RE.match(t) or _SMALL_TALK_RE.match(t))

def _is_identity_query(text: str) -> bool:
    return bool(_IDENTITY_RE.search(text.strip()))

# ── Embedding model (shared, loaded once) ─────────────────────────────────
@lru_cache(maxsize=1)
def get_embedding_model():
    try:
        model_path = settings.EMBEDDING_MODEL
        import os
        is_local = os.path.isdir(model_path) or model_path.startswith("/") or model_path.startswith("./")
        logger.info(f"[RAG] Loading embedding model: {model_path}")
        return SentenceTransformer(model_path, local_files_only=is_local)
    except Exception as e:
        logger.error(f"[RAG] SentenceTransformer load failed: {e}")
        return None

def _encode_text_with_logging(model, text: str) -> np.ndarray:
    try:
        embedding = model.encode(text, convert_to_tensor=False)
        logger.info(f"Generated embedding for: {text[:50]}... (dim={len(embedding)})")
        return embedding
    except Exception as e:
        logger.error(f"Error encoding text: {str(e)}")
        return np.zeros(768)

async def get_embedding(text: str) -> np.ndarray:
    model = get_embedding_model()
    if model:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_executor, _encode_text_with_logging, model, text)
    return np.zeros(768)

def invalidate_cache(university_id: str):
    """Signal that the knowledge base has changed; clear in-memory vector store & semantic cache."""
    store = get_vector_store(university_id)
    if store:
        store.clear()
    
    # Also clear the persistent semantic cache in Firestore (Async side effect)
    try:
        cache = get_semantic_cache(university_id)
        _executor.submit(lambda: asyncio.run(cache.clear()))
    except Exception as e:
        logger.warning(f"[RAG] Failed to trigger semantic cache clear: {e}")

    logger.info(f"[RAG] Cache invalidated for {university_id}")

class RAGService:
    def __init__(self, university_id: str):
        self.university_id = university_id
        self.vector_store = get_vector_store(university_id)

    async def load_kb(self) -> bool:
        """Isolated per-university KB loading."""
        try:
            kb_data = await get_knowledge_base(self.university_id)
            if not kb_data:
                return False

            self.vector_store.clear()
            docs, vectors = [], []
            for item in kb_data:
                v = item.get("embedding_vector")
                if v and len(v) > 0:
                    docs.append({
                        "question": item.get("question"),
                        "answer": item.get("answer"),
                        "category": item.get("category"),
                        "source": item.get("source"),
                    })
                    vectors.append(v)
            
            if vectors:
                self.vector_store.add_documents(docs, np.array(vectors).astype("float32"))
                return True
            return False
        except Exception as e:
            logger.error(f"[RAG] KB load failed for {self.university_id}: {e}")
            return False

    async def query(
        self,
        query: str,
        university_name: str = "",
        confidence_threshold: float = 0.55,
        category_filter: str | None = None,
        user_id: str | None = None,
    ) -> dict:
        try:
            return await self._query_impl(query, university_name, confidence_threshold, category_filter, user_id)
        except Exception as e:
            logger.exception(f"[RAG] Unhandled error: {e}")
            uni = university_name or self.university_id.upper()
            return {
                "answer": f"I am here to assist you with everything related to {uni}. Whether you need details about admissions, placements, scholarships, or campus life, I would be happy to help you navigate your journey here.",
                "category": "general",
                "confidence": 0.0,
                "sources": [],
                "used_fallback": True
            }

    async def _query_impl(self, query: str, university_name: str, confidence_threshold: float, category_filter: str | None, user_id: str | None) -> dict:
        uni_name = university_name or self.university_id.upper()
        
        # ── Step 0: Get Query Embedding (needed for both Cache and Search) ─
        query_emu = await get_embedding(query)

        # ── Step 0b: Semantic Cache Lookup ──────────────────────────
        cache = get_semantic_cache(self.university_id)
        cached_result = await cache.lookup(query_emu, threshold=0.96)
        if cached_result:
            return {
                **cached_result,
                "sources": ["semantic_cache"],
                "used_fallback": False
            }

        # ── Step 0c: Memory Context ──────────────────────────────────
        memory_results = ""
        if user_id and user_id != "anonymous":
            try:
                m_list = await search_memories(query, user_id)
                memory_results = build_memory_context(m_list)
            except Exception as e:
                logger.warning(f"[RAG] Memory search failed: {e}")

        # ── Step 1: Greeting / Identity ─────────────────────────────
        if _is_conversational(query):
            return {
                "answer": f"Hello! 👋 I'm your {uni_name} AI Assistant. I can help you with admissions, courses, fees, scholarships, placements, and more. How can I assist you today?",
                "category": "general",
                "confidence": 1.0,
                "sources": ["deterministic_greeting"],
                "used_fallback": False,
            }

        if _is_identity_query(query):
            answer = await generate_response(query, self.university_id, uni_name, memory_results=memory_results)
            return {
                "answer": answer or f"I am Arvix AI, the official assistant for {uni_name}.",
                "category": "general",
                "confidence": 1.0,
                "sources": ["identity"],
                "used_fallback": False,
            }

        # ── Step 2: Vector Search ────────────────────────────────────
        # Auto-load KB if empty (First query optimization)
        if hasattr(self.vector_store, 'documents') and not self.vector_store.documents:
            await self.load_kb()

        try:
            # We already have the embedding from Step 0
            context_docs = self.vector_store.search(query_emu, top_k=5)
        except Exception as e:
            logger.error(f"[RAG] Search failed: {e}")
            context_docs = []

        # ── Step 3: Synthesis ────────────────────────────────────────
        top_score = context_docs[0].get("similarity", 0.0) if context_docs else 0.0
        kb_context = ""
        if top_score > 0.45:
            kb_context = "\n\n".join([
                f"Topic: {d.get('category')}\nQ: {d.get('question')}\nA: {d.get('answer')}"
                for d in context_docs
            ])

        answer = await generate_response(
            query=query,
            university_id=self.university_id,
            university_name=uni_name,
            context=kb_context,
            memory_results=memory_results
        )

        # ── Step 4: Fallback & Resilience ────────────────────────────
        if not answer:
            if top_score > 0.45:
                answer = context_docs[0].get("answer")
            else:
                answer = f"I am here to assist you with everything related to {uni_name}. Whether you need details about admissions, placements, scholarships, or campus life, I would be happy to help you navigate your journey here."

        # ── Step 5: Background Memory Store ──────────────────────────
        if user_id and user_id != "anonymous" and answer:
            try:
                _executor.submit(
                    lambda: asyncio.run(store_memory(f"Q: {query} | A: {answer}", user_id, "chat", 3))
                )
            except Exception: pass

        # ── Step 6: Atomic Cache Store (if high confidence or AI was good) ──
        if answer and top_score > 0.6:
            try:
                # Store in cache for future users
                _executor.submit(
                    lambda: asyncio.run(cache.store(query, query_emu, answer, context_docs[0].get("category", "general") if context_docs else "general"))
                )
            except: pass

        return {
            "answer": answer,
            "category": context_docs[0].get("category", "general") if context_docs else "general",
            "confidence": top_score,
            "sources": list(set([d.get("source") for d in context_docs if d.get("source")]))[:2],
            "used_fallback": top_score < confidence_threshold,
        }
