import os
import sys
import logging
from pathlib import Path

# Add backend and backend/app to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

try:
    from app.services.data_ingestion import ingest_file
except ImportError:
    print("Could not import ingest_file. Ensure dependencies are installed and you are running this from the backend directory.")
    sys.exit(1)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

UNIVERSITY_ID = "lpu"
KB_DIR = Path("knowledge_base/lpu")

def main():
    if not KB_DIR.exists():
        logger.error(f"Directory {KB_DIR} not found. Create it and place your CSV/TXT files inside.")
        return

    files = list(KB_DIR.glob("*.csv")) + list(KB_DIR.glob("*.txt"))
    if not files:
        logger.info(f"No CSV or TXT files found in {KB_DIR}. Place your files there and run again.")
        return

    logger.info(f"Found {len(files)} files to ingest for {UNIVERSITY_ID}.")

    total_created = 0
    for file_path in files:
        logger.info(f"Ingesting: {file_path.name}")
        try:
            result = ingest_file(
                university_id=UNIVERSITY_ID,
                filename=file_path.name,
                file_path=str(file_path),
                replace_existing=False # Append to existing JSON data
            )
            logger.info(f"  ✓ Success: Created {result['created']} entries (Skipped {result['skipped']})")
            total_created += result['created']
        except Exception as e:
            logger.error(f"  ✗ Failed to ingest {file_path.name}: {e}")

    logger.info(f"\n✅ Finished! Successfully ingested {total_created} new entries into the knowledge base.")

if __name__ == "__main__":
    main()
