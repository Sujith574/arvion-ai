from abc import ABC, abstractmethod
import logging
import numpy as np
import os
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

class BaseVectorStore(ABC):
    @abstractmethod
    def add_documents(self, documents: List[Dict[str, Any]], embeddings: np.ndarray):
        """Add documents and their pre-computed embeddings to the store."""
        pass

    @abstractmethod
    def search(self, query_embedding: np.ndarray, top_k: int = 5) -> List[Dict[str, Any]]:
        """Search for the most similar documents given a query embedding."""
        pass

    @abstractmethod
    def clear(self):
        """Clear all documents from the store."""
        pass

class FAISSVectorStore(BaseVectorStore):
    """
    Local FAISS-based implementation. 
    Maintains a per-instance index in memory.
    """
    def __init__(self, university_id: str):
        import faiss
        self.university_id = university_id
        self.index = None
        self.documents = []
        self.dim = 768  # Standard for Gemini/vertex embeddings

    def add_documents(self, documents: List[Dict[str, Any]], embeddings: np.ndarray):
        import faiss
        if embeddings.shape[1] != self.dim:
            self.dim = embeddings.shape[1]
        
        if self.index is None:
            self.index = faiss.IndexFlatIP(self.dim)
        
        # Normalize for Inner Product (effectively Cosine Similarity)
        faiss.normalize_L2(embeddings)
        self.index.add(embeddings)
        self.documents.extend(documents)
        logger.info(f"[FAISSStore] Added {len(documents)} docs for {self.university_id}")

    def search(self, query_embedding: np.ndarray, top_k: int = 5) -> List[Dict[str, Any]]:
        import faiss
        if self.index is None or not self.documents:
            return []
        
        # Ensure query is 2D and normalized
        if query_embedding.ndim == 1:
            query_embedding = query_embedding.reshape(1, -1)
        
        query_norm = query_embedding.copy()
        faiss.normalize_L2(query_norm)
        
        scores, indices = self.index.search(query_norm, min(top_k, len(self.documents)))
        
        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < 0 or idx >= len(self.documents):
                continue
            doc = self.documents[idx].copy()
            doc["similarity"] = float(score)
            results.append(doc)
            
        return results

    def clear(self):
        self.index = None
        self.documents = []
        logger.info(f"[FAISSStore] Cleared index for {self.university_id}")

# Factory for future-proofing
def get_vector_store(university_id: str, store_type: str = "faiss") -> BaseVectorStore:
    if store_type == "faiss":
        return FAISSVectorStore(university_id)
    # Future: if store_type == "pinecone": return PineconeVectorStore(...)
    raise ValueError(f"Unknown vector store type: {store_type}")
