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
import os
from datetime import datetime
from typing import List, Dict, Any
from app.services.firebase import get_db
from app.services.rag_service import invalidate_cache, get_embedding_model
from app.config import get_settings
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)
settings = get_settings()

try:
    import pdfplumber
except ImportError:
    pdfplumber = None

try:
    import docx
except ImportError:
    docx = None

# Initialize AI client for formatting
ai_client = genai.Client(api_key=settings.GEMINI_API_KEY)


def _generate_qa_with_llm(text: str, university_id: str) -> List[Dict[str, str]]:
    """
    Use Gemini to parse raw unstructured text and generate high-quality Q&A pairs.
    This fulfills the requirement: "raw files has to be formatted by the platform itself".
    """
    if not text.strip() or not ai_client:
        return []

    # Limit chunk size for AI processing
    chunks = [text[i:i + 8000] for i in range(0, len(text), 8000)]
    all_entries = []

    for chunk in chunks:
        prompt = f"""
        You are a highly-accurate data formatter for {university_id.upper()} university.
        Extract detailed, factual Question and Answer pairs from the following raw text.
        
        Rules:
        - Focus on: Admissions, Fees, Courses, Hostels, Scholarships, Placements, Eligibility, Contact info.
        - Questions must be natural and common (e.g. "What is the fee for B.Tech CSE?").
        - Answers must be 100% factual based ONLY on the text.
        - If the text is a list, convert each item to a Q&A pair.
        - Output format: A JSON list of objects with "question", "answer", and "category".
        
        Raw Text:
        {chunk}
        
        JSON Output:
        """
        try:
            response = ai_client.models.generate_content(
                model="gemini-1.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.1
                )
            )
            if response.text:
                batch = json.loads(response.text)
                if isinstance(batch, list):
                    all_entries.extend(batch)
        except Exception as e:
            logger.error(f"[Ingest] AI formatting failed: {e}")
            continue
            
    return all_entries


# ── JSON flattener — handles ANY nested structure ──────────────────────────

def _flatten_json(obj: Any, prefix: str = "", separator: str = " ") -> Dict[str, str]:
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
    entries = []
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
                flat = _flatten_json(item)
                if len(flat) >= 2:
                    keys = list(flat.keys())
                    vals = list(flat.values())
                    for i in range(len(keys)):
                        entries.append({
                            "question": f"What is {keys[i]}?",
                            "answer": vals[i],
                            "category": category,
                        })
        return entries

    if isinstance(obj, dict):
        for key, val in obj.items():
            if isinstance(val, dict):
                cat = str(key).lower().replace(" ", "_")
                for subkey, subval in val.items():
                    if isinstance(subval, (str, int, float)):
                        entries.append({
                            "question": f"What is {key} {subkey}?",
                            "answer": str(subval).strip(),
                            "category": cat,
                        })
                    elif isinstance(subval, list):
                        ans = ", ".join(str(v) for v in subval if v)
                        if ans:
                            entries.append({
                                "question": f"What are the {subkey} at {key}?",
                                "answer": ans,
                                "category": cat,
                            })
                    elif isinstance(subval, dict):
                        flat = _flatten_json(subval, prefix=f"{key} {subkey}")
                        for k, v in flat.items():
                            entries.append({"question": f"What is {k}?", "answer": v, "category": cat})
            elif isinstance(val, list):
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

    if not entries and text.strip():
        # User wants "formatted by platform itself" - so if Q/A structure is missing, use AI
        logger.info(f"[Ingest] No structure found in TXT, using AI for '{university_id}'")
        ai_entries = _generate_qa_with_llm(text, university_id)
        entries.extend(ai_entries)
        
    return entries


def _parse_xlsx(content: bytes, university_id: str) -> List[Dict[str, Any]]:
    import openpyxl
    wb = openpyxl.load_workbook(io.BytesIO(content))
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    if not rows: return []
    headers = [str(c).lower().strip() if c else f"col{i}" for i, c in enumerate(rows[0])]
    entries = []
    for row in rows[1:]:
        row_dict = {headers[i]: (str(v).strip() if v is not None else "") for i, v in enumerate(row)}
        q = (row_dict.get("question") or row_dict.get("q") or "").strip()
        a = (row_dict.get("answer") or row_dict.get("a") or "").strip()
        if q and a:
            entries.append({"question": q, "answer": a, "category": row_dict.get("category", "general")})
    return entries


def _parse_pdf(content: bytes, university_id: str) -> List[Dict[str, Any]]:
    if not pdfplumber: return []
    text = ""
    with pdfplumber.open(io.BytesIO(content)) as pdf:
        for page in pdf.pages:
            text += page.extract_text() + "\n"
    
    logger.info(f"[Ingest] Extracted {len(text)} chars from PDF, using AI formatter...")
    return _generate_qa_with_llm(text, university_id)


def _parse_docx(content: bytes, university_id: str) -> List[Dict[str, Any]]:
    if not docx: return []
    doc = docx.Document(io.BytesIO(content))
    text = "\n".join([p.text for p in doc.paragraphs])
    logger.info(f"[Ingest] Extracted {len(text)} chars from DOCX, using AI formatter...")
    return _generate_qa_with_llm(text, university_id)


# ── Main Ingest Function ───────────────────────────────────────────────────

def ingest_file(
    university_id: str,
    filename: str,
    file_path: str,
    replace_existing: bool = False,
) -> Dict[str, int]:
    """
    Parse any data file and write knowledge entries to Firestore for `university_id`.
    Now computes embeddings during ingestion to improve chat speed.
    """
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    
    # Read content from path to avoid OOM in router
    with open(file_path, "rb") as f:
        content = f.read()

    parsers = {
        "json": _parse_json,
        "csv": _parse_csv,
        "txt": _parse_txt,
        "pdf": _parse_pdf,
        "docx": _parse_docx,
        "xlsx": _parse_xlsx,
        "xls": _parse_xlsx,
    }

    parser = parsers.get(ext)
    if parser is None:
        parser = _parse_txt

    try:
        entries = parser(content, university_id)
    except Exception as exc:
        logger.error(f"[Ingest] Parse failure: {exc}")
        raise ValueError(f"Failed to parse '{filename}': {exc}")

    if not entries:
        raise ValueError("No valid entries extracted.")

    db = get_db()
    col = db.collection("university_knowledge")

    if replace_existing:
        existing = list(col.where("university_id", "==", university_id).stream())
        for i in range(0, len(existing), 250):
            batch = db.batch()
            for doc in existing[i:i+250]: batch.delete(doc.reference)
            batch.commit()

    model = get_embedding_model()
    now = datetime.utcnow().isoformat()
    created = skipped = 0

    # ── Step 1: Prepare valid entries and questions ──
    valid_entries = []
    questions = []
    for entry in entries:
        q = str(entry.get("question", "")).strip()
        a = str(entry.get("answer", "")).strip()
        if not q or not a:
            skipped += 1
            continue
        valid_entries.append({
            "q": q,
            "a": a,
            "cat": str(entry.get("category", "general")).strip()
        })
        questions.append(q)

    if not valid_entries:
        return {"created": 0, "skipped": skipped}

    # ── Step 2: Batch compute all embeddings (massive speedup!) ──
    embeddings = [None] * len(valid_entries)
    if model and questions:
        try:
            logger.info(f"[Ingest] Batch encoding {len(questions)} items for {university_id}...")
            # model.encode works exponentially faster on lists than individual strings
            encoded_vectors = model.encode(questions, normalize_embeddings=True, show_progress_bar=False)
            embeddings = [v.tolist() for v in encoded_vectors]
        except Exception as e:
            logger.error(f"[Ingest] Batch encoding failed: {e}")

    # ── Step 3: Parallel Firestore Batch Writes ──
    BATCH_SIZE = 100
    batches = []
    current_batch = db.batch()
    count_in_batch = 0

    for i, entry in enumerate(valid_entries):
        doc_ref = col.document(str(uuid.uuid4()))
        current_batch.set(doc_ref, {
            "university_id": university_id,
            "question": entry["q"],
            "answer": entry["a"],
            "category": entry["cat"],
            "source": filename,
            "verified": True,
            "created_at": now,
            "embedding_vector": embeddings[i],
        })
        count_in_batch += 1
        created += 1
        
        if count_in_batch >= BATCH_SIZE:
            batches.append(current_batch)
            current_batch = db.batch()
            count_in_batch = 0
            
    if count_in_batch > 0:
        batches.append(current_batch)

    # Commit all batches concurrently
    from concurrent.futures import ThreadPoolExecutor
    with ThreadPoolExecutor(max_workers=5) as executor:
        list(executor.map(lambda b: b.commit(), batches))

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
        except Exception: pass

    invalidate_cache(university_id)
    return {"created": created, "skipped": skipped}

