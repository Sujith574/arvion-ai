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

import pickle
import faiss
from app.config import get_settings

class FAISSVectorStore(BaseVectorStore):
    """
    Local FAISS-based implementation with GCS persistence.
    """
    def __init__(self, university_id: str):
        self.university_id = university_id
        self.index = None
        self.documents = []
        self.dim = 768
        self._load_from_gcs()

    def _get_gcs_info(self):
        settings = get_settings()
        bucket_name = settings.CLOUD_STORAGE_BUCKET
        if not bucket_name:
            return None, None
        try:
            from google.cloud import storage
            client = storage.Client()
            bucket = client.bucket(bucket_name)
            return bucket, f"faiss_indexes/{self.university_id}"
        except Exception as e:
            logger.warning(f"[FAISS] GCS client init failed: {e}")
            return None, None

    def _load_from_gcs(self):
        bucket, prefix = self._get_gcs_info()
        if not bucket: return
        
        try:
            # Load documents
            doc_blob = bucket.blob(f"{prefix}/documents.pkl")
            if doc_blob.exists():
                data = doc_blob.download_as_bytes()
                self.documents = pickle.loads(data)
                logger.info(f"[FAISS] Loaded {len(self.documents)} docs for {self.university_id} from GCS")
            
            # Load index
            idx_blob = bucket.blob(f"{prefix}/index.faiss")
            if idx_blob.exists():
                tmp_path = f"/tmp/{self.university_id}.faiss"
                idx_blob.download_to_filename(tmp_path)
                self.index = faiss.read_index(tmp_path)
                os.remove(tmp_path)
                logger.info(f"[FAISS] Loaded index for {self.university_id} from GCS")
        except Exception as e:
            logger.error(f"[FAISS] GCS Load failed for {self.university_id}: {e}")

    def _save_to_gcs(self):
        bucket, prefix = self._get_gcs_info()
        if not bucket or self.index is None: return
        
        try:
            # Save documents
            doc_blob = bucket.blob(f"{prefix}/documents.pkl")
            doc_blob.upload_from_string(pickle.dumps(self.documents))
            
            # Save index
            idx_blob = bucket.blob(f"{prefix}/index.faiss")
            tmp_path = f"/tmp/{self.university_id}_save.faiss"
            faiss.write_index(self.index, tmp_path)
            idx_blob.upload_from_filename(tmp_path)
            os.remove(tmp_path)
            logger.info(f"[FAISS] Saved index and docs for {self.university_id} to GCS")
        except Exception as e:
            logger.error(f"[FAISS] GCS Save failed for {self.university_id}: {e}")

    def add_documents(self, documents: List[Dict[str, Any]], embeddings: np.ndarray):
        if embeddings.shape[1] != self.dim:
            self.dim = embeddings.shape[1]
        
        if self.index is None:
            self.index = faiss.IndexFlatIP(self.dim)
        
        faiss.normalize_L2(embeddings)
        self.index.add(embeddings)
        self.documents.extend(documents)
        logger.info(f"[FAISSStore] Added {len(documents)} docs for {self.university_id}")
        self._save_to_gcs()

    def search(self, query_embedding: np.ndarray, top_k: int = 5) -> List[Dict[str, Any]]:
        if self.index is None or not self.documents:
            return []
        
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
        # Optionally clear from GCS too, but we might want to keep history
        bucket, prefix = self._get_gcs_info()
        if bucket:
            try:
                bucket.blob(f"{prefix}/documents.pkl").delete(if_exists=True)
                bucket.blob(f"{prefix}/index.faiss").delete(if_exists=True)
            except: pass
        logger.info(f"[FAISSStore] Cleared index for {self.university_id}")

_stores: Dict[str, BaseVectorStore] = {}

def get_vector_store(university_id: str, store_type: str = "faiss") -> BaseVectorStore:
    if university_id not in _stores:
        if store_type == "faiss":
            _stores[university_id] = FAISSVectorStore(university_id)
        else:
            raise ValueError(f"Unknown vector store type: {store_type}")
    return _stores[university_id]
