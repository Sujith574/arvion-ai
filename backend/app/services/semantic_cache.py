import logging
import asyncio
import numpy as np
import datetime
from typing import Optional, Dict
from app.services.firebase import get_db

logger = logging.getLogger(__name__)

class SemanticCache:
    """
    Persistent Vector Cache for AI Responses.
    Stores query embeddings and their corresponding answers in Firestore.
    """
    def __init__(self, university_id: str):
        self.university_id = university_id
        self.collection = "semantic_cache"

    async def lookup(self, query_vector: np.ndarray, threshold: float = 0.97) -> Optional[Dict]:
        """
        Check if a highly similar query has been answered before.
        Note: In production, this would use a proper Vector DB. 
        For now, we query the most recent cache entries and perform local similarity.
        """
        db = get_db()
        # Fetch last 100 cache entries for this university
        docs = (
            db.collection(self.collection)
            .where("university_id", "==", self.university_id)
            .order_by("timestamp", direction="DESCENDING")
            .limit(100)
            .stream()
        )

        best_match = None
        highest_score = 0.0

        for doc in docs:
            data = doc.to_dict()
            cached_vector = np.array(data.get("vector"), dtype="float32")
            
            # Simple Cosine Similarity (vectors are normalized)
            score = np.dot(query_vector, cached_vector)
            
            if score > highest_score:
                highest_score = score
                best_match = data

        if highest_score >= threshold and best_match:
            logger.info(f"[Cache] Semantic HIT! Score: {highest_score:.4f}")
            return {
                "answer": best_match["answer"],
                "category": best_match.get("category", "general"),
                "confidence": highest_score,
                "cached": True
            }
        
        return None

    async def store(self, query: str, vector: np.ndarray, answer: str, category: str = "general"):
        """Store a successful AI response in the semantic cache."""
        try:
            db = get_db()
            cache_data = {
                "university_id": self.university_id,
                "query": query,
                "vector": vector.tolist(),
                "answer": answer,
                "category": category,
                "timestamp": datetime.datetime.utcnow().isoformat()
            }
            db.collection(self.collection).add(cache_data)
        except Exception as e:
            logger.error(f"[Cache] Store failed: {e}")

_cache_instances: Dict[str, SemanticCache] = {}

def get_semantic_cache(university_id: str) -> SemanticCache:
    if university_id not in _cache_instances:
        _cache_instances[university_id] = SemanticCache(university_id)
    return _cache_instances[university_id]
