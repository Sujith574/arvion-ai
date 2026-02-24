import logging
from google import genai
from google.genai import types
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

client = genai.Client(api_key=settings.GEMINI_API_KEY)

SYSTEM_INSTRUCTION = """You are a helpful university assistant for {university_id}.
Your job is to answer questions about this university accurately and concisely.

Rules you must follow:
- Answer ONLY questions related to this university.
- If you don't know something specific, say so honestly.
- Suggest contacting the admissions office for information you are unsure about.
- Never invent fees, dates, phone numbers, or contact details.
- Be friendly, clear, and helpful.
- Keep responses concise — 2 to 4 sentences max unless more detail is needed.

Partial context from the knowledge base (use this if relevant):
{context}"""


async def call_fallback_llm(
    query: str,
    university_id: str,
    context: str,
) -> str:
    """
    Call Google Gemini as the fallback when RAG confidence is low.
    Uses gemini-2.0-flash for speed and cost efficiency.
    """
    try:
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=query,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION.format(
                    university_id=university_id,
                    context=context[:2000],  # Cap context length
                ),
                temperature=0.2,      # Low = factual, consistent
                max_output_tokens=500,
                candidate_count=1,
            ),
        )

        return response.text

    except Exception as e:
        logger.error(f"[Gemini] Fallback failed: {e}")
        return (
            "I'm having trouble answering that right now. "
            "Please contact the admissions office directly for accurate information."
        )