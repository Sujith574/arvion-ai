import httpx
import logging
from google import genai
from google.genai import types
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

client = genai.Client(api_key=settings.GEMINI_API_KEY)

SYSTEM_INSTRUCTION = """You are Arvix AI, a helpful university assistant for {university_id}.
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


async def generate_response(
    query: str,
    university_id: str,
    context: str = "",
    system_instruction: str = None,
) -> str:
    """
    Primary API: Prolixis API (Chat Completions)
    Secondary API (Fallback): Google Gemini
    """
    uni_name = university_id.upper()
    
    if not system_instruction:
        system_instruction = SYSTEM_INSTRUCTION.format(university_id=uni_name, context=context[:2000])

    # 1. Primary Attempt: Prolixis API (async — non-blocking)
    if settings.PROLIXIS_API_KEY:
        try:
            headers = {
                "Authorization": f"Bearer {settings.PROLIXIS_API_KEY}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": "prolixis-core",
                "messages": [
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": query}
                ],
                "temperature": 0.2,
                "max_tokens": 800
            }

            base_url = settings.PROLIXIS_BASE_URL.rstrip("/")
            if "/v1" in base_url:
                full_url = f"{base_url}/chat/completions"
            else:
                full_url = f"{base_url}/v1/chat/completions"

            logger.info(f"[Prolixis] Calling: {full_url}")

            async with httpx.AsyncClient(timeout=3.0) as http:
                response = await http.post(full_url, json=payload, headers=headers)

            if response.status_code == 200:
                data = response.json()
                return data["choices"][0]["message"]["content"]
            else:
                logger.warning(f"[Prolixis] API returned {response.status_code}, falling back to Gemini.")
        except Exception as e:
            logger.warning(f"[Prolixis] API call failed: {e}, falling back to Gemini.")

    # 2. Fallback Attempt: Gemini API
    if not client:
        return "Service temporarily unavailable. Please contact the admissions office."

    try:
        # Using gemini-1.5-flash for maximum compatibility/stability
        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=query,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.2,
                max_output_tokens=800,
                candidate_count=1,
            ),
        )

        return response.text if response.text else "I apologize, but I couldn't generate a response."

    except Exception as e:
        import traceback
        logger.error(f"[Gemini] Fallback failed for {uni_name}: {e}\n{traceback.format_exc()}")
        # Return empty string — callers in rag_service use proper university-focused fallbacks
        return ""
