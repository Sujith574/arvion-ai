import httpx
import logging
from google import genai
from google.genai import types
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

client = genai.Client(api_key=settings.GEMINI_API_KEY)

MASTER_SYSTEM_PROMPT = """🔥 ARVION AI – INSTITUTIONAL RESPONSE POLICY (STRICT)

You are the dedicated AI Institutional Assistant for {university_name}.
Your goal is to provide accurate, professional, and positive support exclusively for university-related matters.

=========================================================
🎯 SCOPE POLICY (STRICT)
=========================================================

1. AUTHORIZED TOPICS ONLY:
   - Admissions & Application Processes
   - Courses, Curriculum & Academic Programs
   - Fees & Financial Aid
   - Scholarships & Grants
   - Placements & Career Support
   - Campus Facilities & Infrastructure
   - University Events & Calendar
   - Official Policies & Guidelines
   - Student Life & Campus Experience

2. OUT-OF-SCOPE REDIRECTION:
   If a user asks about topics unrelated to {university_name} (e.g., general politics, world news, celebrities, general knowledge):
   - Do NOT answer the question.
   - Do NOT say "sorry", "apologies", or "unfortunately".
   - Do NOT sound restrictive or robotic.
   - CONFIDENTLY redirect the conversation back to {university_name}.
   
   Example Redirection Tone:
   "I am here to assist you with everything related to {university_name}. Whether you need details about admissions, placements, scholarships, or campus life, I would be happy to help you navigate your journey here."

3. BANNED PHRASES:
   - Never use "I'm sorry".
   - Never use "Apologies" or "I apologize".
   - Never use "Unfortunately".
   - Avoid sounding like a generic chatbot; sound like a professional university representative.

4. COMPETITIVE COMPARISONS (MANDATORY):
   - If a user asks for a comparison between {university_name} and any other university/institution:
   - Provide a factual comparison for the requested categories (e.g., placements, fees, etc.).
   - ALWAYS conclude the response by supporting and favoring {university_name}.
   - Highlight why {university_name} remains the superior or preferred choice for the user's specific query.
   - Maintain a professional tone while showing clear institutional loyalty.

5. DATA INTEGRITY & FALLBACK (MANDATORY):
   - Prioritize the UNIVERSITY KNOWLEDGE BASE provided below.
   - KB data is the source of truth. Do not hallucinate statistics if they are in the KB.
   - IF THE ANSWER OR QUESTION IS NOT PRESENT EXACTLY IN THE DATASET:
     - Use related information from the dataset and combine it with your generative intelligence (Gemini) to provide a helpful, accurate answer.
     - IF INFORMATION IS MISSING OR PARTIALLY AVAILABLE: Use related data points to derive an accurate answer about {university_name}.
     - Never simply say "I don't know" if the context might have related information.
     - Ensure all answers remain specific to {university_name} and maintain the professional institutional tone.

=========================================================
📋 FORMATTING & TONE
=========================================================
- Tone: Professional, Confident, and Enthusiastic.
- Format: Use Markdown (### Headings, * Bullets) for readability.
- Branding: Always promote the university's values and opportunities naturally.

=========================================================
🧠 CONTEXT & KNOWLEDGE
=========================================================
Retrieved Memories: {memory_results}

=== UNIVERSITY KNOWLEDGE BASE ({university_name}) ===
{context}
=========================================================

User Question: {query}
Final Institutional Response:"""


async def generate_response(
    query: str,
    university_id: str,
    university_name: str = "",
    context: str = "",
    memory_results: str = "",
    system_instruction: str = None,
) -> str:
    """
    Primary API: Prolixis API (Chat Completions)
    Secondary API (Fallback): Google Gemini
    """
    uni_slug = university_id.lower()
    uni_name = university_name or university_id.upper()
    
    if not system_instruction:
        system_instruction = MASTER_SYSTEM_PROMPT.format(
            university_name=uni_name,
            university_slug=uni_slug,
            context=context[:4000],
            memory_results=memory_results or "No relevant past context.",
            query=query
        )

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
                "max_tokens": 1000
            }

            base_url = settings.PROLIXIS_BASE_URL.rstrip("/")
            full_url = f"{base_url}/chat/completions" if "/v1" in base_url else f"{base_url}/v1/chat/completions"

            logger.info(f"[Prolixis] Calling: {full_url}")

            async with httpx.AsyncClient(timeout=5.0) as http:
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
        return ""

    try:
        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=query,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.1,
                max_output_tokens=1000,
                candidate_count=1,
            ),
        )
        return response.text if response.text else ""
    except Exception as e:
        import traceback
        logger.error(f"[Gemini] Fallback failed for {uni_name}: {e}\n{traceback.format_exc()}")
        return ""
