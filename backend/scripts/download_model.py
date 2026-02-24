import os
import sys

# Set cache before importing
os.environ['TRANSFORMERS_CACHE'] = '/app/model_cache'
os.environ['SENTENCE_TRANSFORMERS_HOME'] = '/app/model_cache'

try:
    from sentence_transformers import SentenceTransformer
    model_name = "all-MiniLM-L6-v2"
    save_path = "/app/model_cache"
    
    print(f"Downloading model {model_name}...")
    os.makedirs(save_path, exist_ok=True)
    
    model = SentenceTransformer(model_name)
    model.save(save_path)
    print(f"Model saved to {save_path}")
    
except Exception as e:
    print(f"ERROR downloading model: {e}")
    # Don't exit 1 yet, let's see if we can at least build the container
    # Actually, we SHOULD exit 1 if this is critical, but maybe the user wants to see it fail differently.
    # No, it's better to fail the build so we know.
    sys.exit(1)

