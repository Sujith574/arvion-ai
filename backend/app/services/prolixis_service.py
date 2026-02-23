"""
Prolixis Continuum Memory API Client
=====================================
REST integration with https://api.prolixis.in

Each user gets an isolated memory namespace (their user_id).
- store_memory()  → POST /memory-store
- search_memories() → POST /memory-search  (filters similarity > 0.75, top 2)

This replaces the need for a separate LLM — Prolixis handles RAG + LLM internally.
"""

import httpx
import logging
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Base URL and auth headers for Prolixis
_BASE_URL = settings.PROLIXIS_BASE_URL  # https://api.prolixis.in
_HEADERS = {
    "Authorization": f"Bearer {settings.PROLIXIS_API_KEY}",
    "Content-Type": "application/json",
}

# Similarity threshold — only include results above this score
SIMILARITY_THRESHOLD = 0.75
MAX_RESULTS = 2


async def store_memory(
    content: str,
    namespace: str,
    memory_type: str = "chat",
    importance: int = 3,
) -> bool:
    """
    Store a single memory entry in Prolixis Continuum.

    Args:
        content:     The text content to store (user message or AI reply).
        namespace:   The user_id — isolates memory per end-user.
        memory_type: One of 'chat', 'fact', 'preference'. Defaults to 'chat'.
        importance:  1–5 scale. Higher = more likely to surface in searches.

    Returns:
        True if stored successfully, False on error.
    """
    payload = {
        "content": content,
        "namespace": namespace,
        "memory_type": memory_type,
        "importance": importance,
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{_BASE_URL}/memory-store",
                json=payload,
                headers=_HEADERS,
            )
            response.raise_for_status()
            logger.info(f"[Prolixis] Stored memory for namespace={namespace}")
            return True
    except httpx.HTTPStatusError as e:
        logger.error(f"[Prolixis] store_memory HTTP error: {e.response.status_code} — {e.response.text}")
        return False
    except Exception as e:
        logger.error(f"[Prolixis] store_memory failed: {e}")
        return False


async def search_memories(query: str, namespace: str) -> list[dict]:
    """
    Search Prolixis Continuum for relevant past memories.

    Filters results to those with similarity > SIMILARITY_THRESHOLD (0.75)
    and returns at most MAX_RESULTS (2) entries.

    Args:
        query:     The current user query / search string.
        namespace: The user_id — isolates memory per end-user.

    Returns:
        List of memory dicts with 'content' and 'similarity' keys.
        Empty list if no relevant memories found or on error.
    """
    payload = {
        "q": query,
        "namespace": namespace,
        "limit": MAX_RESULTS,
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{_BASE_URL}/memory-search",
                json=payload,
                headers=_HEADERS,
            )
            response.raise_for_status()
            data = response.json()

            # API may return { results: [...] } or a direct list
            memories = data.get("results", data) if isinstance(data, dict) else data

            # Filter by similarity threshold
            filtered = [
                m for m in memories
                if isinstance(m, dict) and m.get("similarity", 0) >= SIMILARITY_THRESHOLD
            ]

            logger.info(
                f"[Prolixis] search_memories namespace={namespace} "
                f"query='{query[:60]}' → {len(filtered)} results above threshold"
            )
            return filtered[:MAX_RESULTS]

    except httpx.HTTPStatusError as e:
        logger.error(f"[Prolixis] search_memories HTTP error: {e.response.status_code} — {e.response.text}")
        return []
    except Exception as e:
        logger.error(f"[Prolixis] search_memories failed: {e}")
        return []


def build_memory_context(memories: list[dict]) -> str:
    """
    Convert a list of Prolixis memory results into a formatted context string
    to prepend to the RAG / LLM prompt.
    """
    if not memories:
        return ""
    lines = ["## Relevant past context from this user's conversation history:"]
    for i, m in enumerate(memories, 1):
        content = m.get("content", "").strip()
        sim = m.get("similarity", 0)
        lines.append(f"{i}. [{sim:.0%} match] {content}")
    return "\n".join(lines)
