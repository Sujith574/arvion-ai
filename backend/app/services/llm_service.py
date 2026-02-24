import requests
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
    Primary API: Prolixis API
    Secondary API (Fallback): Google Gemini
    """
    prompt = f"System: {SYSTEM_INSTRUCTION.format(university_id=university_id, context=context[:2000])}\nUser: {query}"

    # 1. Primary Attempt: Prolixis API
    if settings.PROLIXIS_API_KEY:
        try:
            headers = {
                "Authorization": f"Bearer {settings.PROLIXIS_API_KEY}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": "prolixis-core",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.2,
                "max_tokens": 500
            }
            
            # 5-second timeout to prevent extreme hangs before fallback
            response = requests.post(f"{settings.PROLIXIS_BASE_URL}/v1/chat/completions", json=payload, headers=headers, timeout=5)
            
            if response.status_code == 200:
                data = response.json()
                return data['choices'][0]['message']['content']
            else:
                logger.warning(f"[Prolixis] API returned {response.status_code}, falling back to Gemini.")
        except Exception as e:
            logger.warning(f"[Prolixis] API call failed: {e}, falling back to Gemini.")

    # 2. Fallback Attempt: Gemini API
    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=query,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION.format(
                    university_id=university_id,
                    context=context[:2000],  # Cap context length
                ),
                temperature=0.2,
                max_output_tokens=500,
                candidate_count=1,
            ),
        )

        return response.text

    except Exception as e:
        logger.error(f"[Gemini] Fallback failed completely: {e}")
        return (
            "I'm having trouble answering that right now. "
            "Please contact the admissions office directly for accurate information."
        )