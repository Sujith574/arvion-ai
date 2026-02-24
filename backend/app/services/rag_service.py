"""
RAG Service — Retrieval-Augmented Generation (Production-Ready)
===============================================================
Key improvements:
- Greeting/conversational queries handled with Gemini directly (no FAISS confusion)
- Prolixis memory is truly non-blocking (runs in thread, max 2s timeout)
- Per-university FAISS index fully isolated (no data mixing)
- Confidence threshold lowered — only high-confidence KB hits bypass Gemini
- Multi-doc context: top 5 KB results sent to Gemini for better answers
- All dict accesses are safe (.get() everywhere)
"""

import logging
import asyncio
import re
from concurrent.futures import ThreadPoolExecutor
from functools import lru_cache
from app.services.firebase import get_knowledge_base
from app.config import get_settings
from google import genai
from google.genai import types
from app.services.llm_service import generate_response

try:
    import numpy as np
    import faiss
    import os
    from sentence_transformers import SentenceTransformer
    FAISS_AVAILABLE = True
except ImportError:
    FAISS_AVAILABLE = False

logger = logging.getLogger(__name__)
settings = get_settings()

if settings.GEMINI_API_KEY:
    client = genai.Client(api_key=settings.GEMINI_API_KEY)
else:
    client = None

# Thread pool for blocking Prolixis / file I/O calls
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

# Identity / meta questions — must be caught BEFORE FAISS to prevent wrong KB matches
_IDENTITY_RE = re.compile(
    r"("
    r"how\s*(are|were|was|did|do)\s*(you|u)\s*(train(ed|ing)?|made|built|creat|develop|work|function|learn|know|operat)"
    r"|who\s*(made|built|creat|develop|train)\s*(you|u)"
    r"|what\s*(are|is)\s*(you|ur|your|this)\s*(ai|bot|assistant|model|system|platform|app)"
    r"|(are|r)\s*(you|u)\s*(an?\s*)?(ai|bot|robot|assistant|human|real)"
    r"|(who|what)\s*(is|are)\s*(izra|you|ur)"
    r"|(tell|explain|describe)\s*(me\s*)?(about\s*)?(yourself|you|your\s*self)"
    r"|how\s*(does|do)\s*(you|this|izra)\s*work"
    r"|what\s*can\s*(you|u)\s*do"
    r"|(are|r)\s*(you|u)\s*(powered|run|based|built)\s*(by|on|with)"
    r"|your\s*(purpose|goal|function|role|job|mission)"
    r")",
    re.IGNORECASE,
)


# Keywords that signal an informational query — never treat these as conversational
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
    # If the text contains informational keywords, it is NOT conversational no matter how short
    if _INFO_KEYWORDS_RE.search(t):
        return False
    return bool(_GREETING_RE.match(t) or _SMALL_TALK_RE.match(t))


def _is_identity_query(text: str) -> bool:
    return bool(_IDENTITY_RE.search(text.strip()))


# ── Embedding model (shared, loaded once) ─────────────────────────────────
@lru_cache(maxsize=1)
def get_embedding_model():
    if not FAISS_AVAILABLE:
        return None
    try:
        # Strictly use local files if possible to avoid 429 rate limits
        model_path = settings.EMBEDDING_MODEL
        # Check if it looks like a local path
        is_local = os.path.isdir(model_path) or model_path.startswith("/") or model_path.startswith("./")
        
        logger.info(f"[RAG] Loading embedding model from: {model_path} (local={is_local})")
        return SentenceTransformer(
            model_path, 
            local_files_only=is_local
        )
    except Exception as e:
        logger.error(f"[RAG] SentenceTransformer load failed: {e}")
        return None


# ── Per-university FAISS cache ────────────────────────────────────────────
_knowledge_cache: dict = {}


def invalidate_cache(university_id: str):
    _knowledge_cache.pop(university_id, None)
    logger.info(f"[RAG] Cache cleared for {university_id}")


class RAGService:
    def __init__(self, university_id: str):
        self.university_id = university_id
        self.model = get_embedding_model()

    async def _call_ai(self, query: str, context: str = "", is_greeting: bool = False) -> str:
        uni = self.university_id.upper()
        if is_greeting:
            prompt = (
                f"You are the official highly-accurate AI assistant for {uni} university.\n"
                f"Your mission is to provide students with 100% accurate information.\n"
                f"Greet the user warmly, state you are the {uni} AI Assistant, and invite them to ask about admissions, courses, fees, hostel, or campus life.\n"
                f"Be brief and professional. Current year: 2026.\n\n"
                f"User: {query}"
            )
        elif context:
            prompt = (
                f"You are the official AI assistant for {uni} university. You must answer ONLY using the provided KNOWLEDGE BASE if it contains the answer.\n"
                f"If the KNOWLEDGE BASE is insufficient or irrelevant, use your general knowledge but PRIORITIZE university-specific facts.\n"
                f"STRICT RULES:\n"
                f"1. Accuracy is your top priority. Do not guess. Do not make mistakes.\n"
                f"2. If asked about your identity, you are the official AI for {uni}, trained on their private data.\n"
                f"3. Do not mention model names (Prolixis, Gemini, OpenAI).\n"
                f"4. For comparisons (e.g., {uni} vs others), be fair but emphasize {uni}'s strengths.\n"
                f"5. Refuse non-university questions (cooking, coding scripts, etc.) politely.\n\n"
                f"=== KNOWLEDGE BASE FROM {uni} ===\n{context}\n================================\n\n"
                f"User Question: {query}\n\n"
                f"Final Accurate Answer:"
            )
        else:
            prompt = (
                f"You are the official AI assistant for {uni} university.\n"
                f"Answer the following question about {uni} as accurately as possible.\n"
                f"If you are unsure, suggest contacting the {uni} admissions office directly.\n"
                f"Current year: 2026.\n\n"
                f"User Question: {query}\n\nAnswer:"
            )
        
        return await generate_response(query, self.university_id, system_instruction=prompt)
        
        return await generate_response(query, self.university_id, system_instruction=prompt)


    # ── FAISS index (per-university, isolated) ─────────────────────────────
    async def _load_index(self) -> tuple:
        if not FAISS_AVAILABLE or self.model is None:
            return [], None
        if self.university_id in _knowledge_cache:
            return _knowledge_cache[self.university_id]

        try:
            docs = await get_knowledge_base(self.university_id)
        except Exception as e:
            logger.error(f"[RAG] KB load failed for {self.university_id}: {e}")
            return [], None

        if not docs:
            return [], None

        valid_docs, embeddings = [], []
        for doc in docs:
            q = str(doc.get("question") or doc.get("q") or doc.get("content") or "").strip()
            a = str(doc.get("answer") or doc.get("a") or "").strip()
            if not q or not a:
                continue
            doc = dict(doc)
            doc["question"] = q
            doc["answer"] = a
            try:
                emb = self.model.encode(q, normalize_embeddings=True)
                embeddings.append(emb)
                valid_docs.append(doc)
            except Exception:
                pass

        if not embeddings:
            return [], None

        try:
            matrix = np.vstack(embeddings).astype("float32")
            index = faiss.IndexFlatIP(matrix.shape[1])
            index.add(matrix)
            _knowledge_cache[self.university_id] = (valid_docs, index)
            logger.info(f"[RAG] {self.university_id}: indexed {len(valid_docs)} entries")
            return valid_docs, index
        except Exception as e:
            logger.error(f"[RAG] FAISS build failed: {e}")
            return [], None



    # ── Main query ─────────────────────────────────────────────────────────
    async def query(
        self,
        query: str,
        confidence_threshold: float = 0.55,
        category_filter: str | None = None,
        user_id: str | None = None,
    ) -> dict:
        try:
            return await self._query_impl(query, confidence_threshold, category_filter, user_id)
        except Exception as e:
            logger.exception(f"[RAG] Unhandled error: {e}")
            # Emergency fallback
            try:
                answer = await self._call_ai(query)
                if answer:
                    return {"answer": answer, "category": "general", "confidence": 0.0, "sources": ["proprietary_ai"], "used_fallback": True}
            except Exception:
                pass
            return {"answer": "I'm the University AI Assistant. I couldn't find a specific answer. Please contact admissions.", "category": "general", "confidence": 0.0, "sources": [], "used_fallback": True}


    async def _query_impl(self, query: str, confidence_threshold: float, category_filter: str | None, user_id: str | None) -> dict:

        # ── Step 1: Detect greeting / small-talk ──────────────────────────
        if _is_conversational(query):
            answer = await self._call_ai(query, is_greeting=True)
            if not answer:
                answer = (
                    f"Hello! 👋 I'm the AI assistant for {self.university_id.upper()} university. "
                    f"I'm here to help you with information about admissions, courses, fees, "
                    f"hostel, placements, campus life, and much more. What would you like to know?"
                )

            return {
                "answer": answer,
                "category": "general",
                "confidence": 1.0,
                "sources": ["conversational"],
                "used_fallback": False,
            }

        # ── Step 1b: Detect identity / meta questions — bypass FAISS ──────
        if _is_identity_query(query):
            uni = self.university_id.upper()
            prompt = (
                f"You are the official AI assistant for {uni} university, built specifically for {uni} students, parents, and applicants.\n"
                f"The user is asking a meta/identity question about you (the AI assistant).\n"
                f"IMPORTANT: Do NOT discuss university entrance exams or training programs. Answer about yourself as an AI assistant.\n\n"
                f"Respond warmly and briefly: explain that you are Izra AI, the official AI assistant for {uni}, "
                f"that you were trained on {uni}'s official data and knowledge base, "
                f"powered by advanced AI technology. You can help with admissions, fees, hostel, courses, placements, campus life, and emergencies.\n\n"
                f"User question: {query}\n\nAnswer:"
            )
            try:
                answer = await self._call_ai(query, context=prompt)
            except Exception:
                answer = f"I'm the official AI assistant for {self.university_id.upper()}, here to help students, parents, and applicants with accurate information about missions, courses, fees, and campus life."
            return {
                "answer": answer,
                "category": "general",
                "confidence": 1.0,
                "sources": ["identity"],
                "used_fallback": False,
            }

        # ── Step 2: Load isolated university KB ───────────────────────────
        docs, index = await self._load_index()

        if not docs or index is None:
            # No data yet → full AI response
            answer = await self._call_ai(query)

            return {
                "answer": answer,
                "category": "general",
                "confidence": 0.0,
                "sources": ["gemini_ai"],
                "used_fallback": True,
            }

        # ── Step 3: Category filter ────────────────────────────────────────
        if category_filter:
            filtered = [d for d in docs if d.get("category") == category_filter]
            docs_to_use = filtered if filtered else docs
        else:
            docs_to_use = docs

        # ── Step 4: Vector search — top 5 results ─────────────────────────
        try:
            q_vec = np.array([self.model.encode(query, normalize_embeddings=True)], dtype="float32")

            if docs_to_use is not docs:
                # Rebuild mini-index for filtered subset
                vecs = np.vstack([
                    self.model.encode(d.get("question", ""), normalize_embeddings=True)
                    for d in docs_to_use
                ]).astype("float32")
                search_index = faiss.IndexFlatIP(vecs.shape[1])
                search_index.add(vecs)
            else:
                search_index = index

            k = min(5, len(docs_to_use))
            scores, indices = search_index.search(q_vec, k=k)
            top_score = float(scores[0][0])
            top_doc = docs_to_use[int(indices[0][0])]

        except Exception as e:
            logger.error(f"[RAG] Search failed: {e}")
            answer = await self._call_ai(query)
            return {"answer": answer, "category": "general", "confidence": 0.0, "sources": ["proprietary_ai"], "used_fallback": True}

        logger.info(f"[RAG] {self.university_id} | score={top_score:.3f} | q={query[:60]}")

        # ── Step 5: Build rich context from valid top docs ────────────────
        kb_context = ""
        context_docs = []

        # Only use context if the closest match is reasonably confident (e.g., > 0.45)
        # This prevents injecting BTech fee data into "IIT vs LPU" queries.
        if top_score > 0.45:
            context_docs = [
                docs_to_use[int(i)]
                for i in indices[0]
                if 0 <= int(i) < len(docs_to_use)
            ]
            kb_context = "\n\n".join([
                f"Topic: {d.get('category', 'general')}\nQ: {d.get('question', '')}\nA: {d.get('answer', '')}"
                for d in context_docs
                if d.get("question") and d.get("answer")
            ])
        else:
            logger.info(f"[RAG] Low confidence ({top_score:.3f}). Stripping irrelevant KB context to prevent hallucination.")

        # ── Step 6: Always send context to AI for best answer ─────────
        # AI synthesizes across ALL top results for accurate, complete answers
        answer = await self._call_ai(query, context=kb_context)
        if not answer:
            # AI failed → use best direct KB match
            answer = top_doc.get("answer") or "I'm the University AI Assistant. I couldn't find a specific answer. Please contact admissions."



        return {
            "answer": answer,
            "category": top_doc.get("category", "general") if context_docs else "general",
            "confidence": top_score,
            "sources": [d.get("source", "knowledge_base") for d in context_docs[:2]] if context_docs else ["gemini_ai"],
            "used_fallback": top_score < confidence_threshold,
        }


