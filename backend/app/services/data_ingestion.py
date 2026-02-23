"""
Data Ingestion Service
=======================
Parses uploaded files of ANY format and converts them into
normalized Q&A knowledge entries in Firestore — per university.

Supported formats:
  - JSON  (Q/A list, flat key-value dict, or deeply nested structures)
  - CSV   (columns: question, answer, category)
  - TXT   ("Q: ...\nA: ..." blocks or plain paragraphs)
  - XLSX  (same as CSV, first sheet)

The service writes entries to:
    /university_knowledge/{auto_id}
and logs the upload in:
    /universities/{slug}.uploaded_files[]
"""

import json
import csv
import io
import uuid
import logging
from datetime import datetime
from typing import List, Dict, Any
from app.services.firebase import get_db
from app.services.rag_service import invalidate_cache

logger = logging.getLogger(__name__)


# ── JSON flattener — handles ANY nested structure ──────────────────────────

def _flatten_json(obj: Any, prefix: str = "", separator: str = " ") -> Dict[str, str]:
    """
    Recursively flatten any JSON object into {path: value} string pairs.
    Lists are enumerated, nested dicts use dot-separated keys as context.
    """
    items: Dict[str, str] = {}
    if isinstance(obj, dict):
        for k, v in obj.items():
            new_key = f"{prefix}{separator}{k}".strip() if prefix else str(k)
            if isinstance(v, (dict, list)):
                items.update(_flatten_json(v, new_key, separator))
            elif v is not None and str(v).strip():
                items[new_key] = str(v).strip()
    elif isinstance(obj, list):
        for i, item in enumerate(obj):
            new_key = f"{prefix}[{i}]" if prefix else f"item{i}"
            if isinstance(item, (dict, list)):
                items.update(_flatten_json(item, new_key, separator))
            elif item is not None and str(item).strip():
                items[new_key] = str(item).strip()
    elif obj is not None and str(obj).strip():
        items[prefix] = str(obj).strip()
    return items


def _entries_from_dict(obj: Any, category: str = "general") -> List[Dict[str, Any]]:
    """
    Convert a dict/list to a list of {question, answer, category} entries.
    Handles multiple schema shapes:
      1. List of {question, answer}
      2. Dict with sections {Section: {key: value}}
      3. Flat dict {key: value}
      4. Arbitrary nested structure (flattened)
    """
    entries = []

    # ── Shape 1: direct list of Q/A objects ─────────────────────────────
    if isinstance(obj, list):
        for item in obj:
            if not isinstance(item, dict):
                continue
            q = (item.get("question") or item.get("q") or item.get("Q") or
                 item.get("prompt") or item.get("title") or "")
            a = (item.get("answer") or item.get("a") or item.get("A") or
                 item.get("response") or item.get("content") or item.get("text") or
                 item.get("description") or "")
            cat = (item.get("category") or item.get("cat") or item.get("topic") or
                   item.get("section") or category)
            if q and a:
                entries.append({"question": str(q).strip(), "answer": str(a).strip(), "category": str(cat).strip()})
            else:
                # Try to flatten this item's sub-structure
                flat = _flatten_json(item)
                if len(flat) >= 2:
                    keys = list(flat.keys())
                    vals = list(flat.values())
                    # Use first key as category context, build Q/A pairs
                    for i in range(len(keys)):
                        entries.append({
                            "question": f"What is {keys[i]}?",
                            "answer": vals[i],
                            "category": category,
                        })
        return entries

    # ── Shape 2: dict with named sections ───────────────────────────────
    if isinstance(obj, dict):
        all_string_values = all(isinstance(v, str) for v in obj.values())

        for key, val in obj.items():
            if isinstance(val, dict):
                # Treat key as a section/category
                cat = str(key).lower().replace(" ", "_")
                for subkey, subval in val.items():
                    if isinstance(subval, (str, int, float)):
                        entries.append({
                            "question": f"What is {key} {subkey}?",
                            "answer": str(subval).strip(),
                            "category": cat,
                        })
                    elif isinstance(subval, list):
                        # Stringify list values
                        ans = ", ".join(str(v) for v in subval if v)
                        if ans:
                            entries.append({
                                "question": f"What are the {subkey} at {key}?",
                                "answer": ans,
                                "category": cat,
                            })
                    elif isinstance(subval, dict):
                        # Deep nested — flatten
                        flat = _flatten_json(subval, prefix=f"{key} {subkey}")
                        for k, v in flat.items():
                            entries.append({"question": f"What is {k}?", "answer": v, "category": cat})

            elif isinstance(val, list):
                # Recurse
                sub_entries = _entries_from_dict(val, category=str(key).lower())
                entries.extend(sub_entries)

            elif isinstance(val, (str, int, float)):
                ans = str(val).strip()
                if ans:
                    entries.append({
                        "question": f"What is {key}?",
                        "answer": ans,
                        "category": category,
                    })

    return entries


# ── Format Parsers ─────────────────────────────────────────────────────────

def _parse_json(content: bytes, university_id: str) -> List[Dict[str, Any]]:
    text = content.decode("utf-8", errors="replace").strip()
    data = json.loads(text)
    entries = _entries_from_dict(data)
    if not entries:
        # Last resort: flatten completely
        flat = _flatten_json(data)
        for k, v in flat.items():
            if v:
                entries.append({"question": f"What is {k}?", "answer": v, "category": "general"})
    return entries


def _parse_csv(content: bytes, university_id: str) -> List[Dict[str, Any]]:
    text = content.decode("utf-8", errors="replace")
    reader = csv.DictReader(io.StringIO(text))
    entries = []
    for row in reader:
        q = (row.get("question") or row.get("Question") or row.get("q") or
             row.get("Q") or row.get("prompt") or "").strip()
        a = (row.get("answer") or row.get("Answer") or row.get("a") or
             row.get("A") or row.get("response") or "").strip()
        cat = (row.get("category") or row.get("Category") or row.get("cat") or "general").strip()
        if q and a:
            entries.append({"question": q, "answer": a, "category": cat})
    return entries


def _parse_txt(content: bytes, university_id: str) -> List[Dict[str, Any]]:
    text = content.decode("utf-8", errors="replace")
    entries = []
    current_q = current_a = current_cat = None

    for line in text.splitlines():
        line = line.strip()
        if not line:
            if current_q and current_a:
                entries.append({"question": current_q, "answer": current_a, "category": current_cat or "general"})
                current_q = current_a = current_cat = None
        elif line.lower().startswith(("q:", "question:")):
            current_q = line.split(":", 1)[1].strip()
        elif line.lower().startswith(("a:", "answer:")):
            current_a = line.split(":", 1)[1].strip()
        elif line.lower().startswith(("category:", "cat:", "section:")):
            current_cat = line.split(":", 1)[1].strip()

    if current_q and current_a:
        entries.append({"question": current_q, "answer": current_a, "category": current_cat or "general"})

    # If no Q/A structure — treat paragraphs as standalone knowledge chunks
    if not entries and text.strip():
        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
        for i, para in enumerate(paragraphs[:500]):
            if len(para) > 20:  # skip tiny lines
                entries.append({
                    "question": f"Paragraph {i+1} from document",
                    "answer": para,
                    "category": "general",
                })
    return entries


def _parse_xlsx(content: bytes, university_id: str) -> List[Dict[str, Any]]:
    try:
        import openpyxl
    except ImportError:
        logger.warning("openpyxl not installed — XLSX parsing skipped")
        return []

    wb = openpyxl.load_workbook(io.BytesIO(content))
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return []

    headers = [str(c).lower().strip() if c else f"col{i}" for i, c in enumerate(rows[0])]
    entries = []
    for row in rows[1:]:
        row_dict = {headers[i]: (str(v).strip() if v is not None else "") for i, v in enumerate(row)}
        q = (row_dict.get("question") or row_dict.get("q") or row_dict.get("prompt") or "").strip()
        a = (row_dict.get("answer") or row_dict.get("a") or row_dict.get("response") or "").strip()
        cat = (row_dict.get("category") or row_dict.get("cat") or "general").strip()
        if q and a:
            entries.append({"question": q, "answer": a, "category": cat})
    return entries


# ── Main Ingest Function ───────────────────────────────────────────────────

def ingest_file(
    university_id: str,
    filename: str,
    content: bytes,
    replace_existing: bool = False,
) -> Dict[str, int]:
    """
    Parse any data file and write knowledge entries to Firestore for `university_id`.
    Returns: {"created": int, "skipped": int}
    """
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    parsers = {
        "json": _parse_json,
        "csv": _parse_csv,
        "txt": _parse_txt,
        "text": _parse_txt,
        "xlsx": _parse_xlsx,
        "xls": _parse_xlsx,
    }

    # Auto-detect JSON if content looks like JSON
    parser = parsers.get(ext)
    if parser is None:
        stripped = content[:200].decode("utf-8", errors="replace").strip()
        if stripped.startswith(("{", "[")):
            parser = _parse_json
        elif "," in stripped:
            parser = _parse_csv
        else:
            parser = _parse_txt

    try:
        entries = parser(content, university_id)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON in file: {e}")
    except Exception as exc:
        raise ValueError(f"Failed to parse '{filename}': {exc}")

    if not entries:
        raise ValueError(
            f"No valid Q&A entries could be extracted from '{filename}'.\n"
            "JSON format: list of {{question, answer}} objects or nested key-value dict.\n"
            "CSV: columns named 'question' and 'answer'.\n"
            "TXT: use 'Q: ...' and 'A: ...' blocks separated by blank lines."
        )

    db = get_db()
    col = db.collection("university_knowledge")

    if replace_existing:
        existing = list(col.where("university_id", "==", university_id).stream())
        # Delete in batches of 250 (Firestore limit)
        for i in range(0, len(existing), 250):
            batch = db.batch()
            for doc in existing[i:i+250]:
                batch.delete(doc.reference)
            batch.commit()
        logger.info(f"[Ingest] Cleared {len(existing)} old entries for {university_id}")

    now = datetime.utcnow().isoformat()
    created = 0
    skipped = 0

    # ── Batch write (250 per batch — Firestore limit) ─────────────────────────
    BATCH_SIZE = 250
    batch = db.batch()
    batch_count = 0

    for entry in entries:
        q = str(entry.get("question", "")).strip()
        a = str(entry.get("answer", "")).strip()
        if not q or not a:
            skipped += 1
            continue
        doc_ref = col.document(str(uuid.uuid4()))
        batch.set(doc_ref, {
            "university_id": university_id,
            "question": q,
            "answer": a,
            "category": str(entry.get("category", "general")).strip(),
            "source": filename,
            "verified": True,
            "created_at": now,
            "embedding_vector": None,
        })
        batch_count += 1
        created += 1

        if batch_count >= BATCH_SIZE:
            batch.commit()
            batch = db.batch()
            batch_count = 0

    # Commit any remaining entries
    if batch_count > 0:
        batch.commit()

    if created > 0:
        try:
            import firebase_admin.firestore as fs
            db.collection("universities").document(university_id).update({
                "uploaded_files": fs.ArrayUnion([{
                    "filename": filename,
                    "entries": created,
                    "uploaded_at": now,
                }])
            })
        except Exception as e:
            logger.warning(f"[Ingest] Could not update file log: {e}")

    # Invalidate FAISS cache so next chat re-indexes
    invalidate_cache(university_id)
    logger.info(f"[Ingest] {university_id}: +{created} entries from '{filename}' ({skipped} skipped)")
    return {"created": created, "skipped": skipped}

