import json
import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

import firebase_admin
from firebase_admin import credentials, firestore
from sentence_transformers import SentenceTransformer
from pathlib import Path

UNIVERSITY_ID = "lpu"
KB_DIR = Path("knowledge_base/lpu")

# Initialize Firebase
cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

print("Loading embedding model (all-MiniLM-L6-v2)...")
model = SentenceTransformer("all-MiniLM-L6-v2")
print("Model ready.\n")


def ingest():
    total = 0
    for json_file in sorted(KB_DIR.glob("*.json")):
        print(f"Processing: {json_file.name}")
        with open(json_file) as f:
            items = json.load(f)

        for item in items:
            # Generate 384-dimensional embedding for the question
            embedding = model.encode(
                item["question"], normalize_embeddings=True
            ).tolist()

            doc_data = {
                **item,
                "university_id": UNIVERSITY_ID,
                "embedding_vector": embedding,
                "verified": True,
                "created_at": firestore.SERVER_TIMESTAMP,
                "updated_at": firestore.SERVER_TIMESTAMP,
            }

            db.collection("university_knowledge").add(doc_data)
            print(f"  ✓ {item['question'][:70]}")
            total += 1

    print(f"\n✅ Done! Ingested {total} entries for university: {UNIVERSITY_ID}")


if __name__ == "__main__":
    ingest()