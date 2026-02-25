import httpx
import logging
from google import genai
from google.genai import types
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

client = genai.Client(api_key=settings.GEMINI_API_KEY)

MASTER_SYSTEM_PROMPT = """🔥 ARVIX AI – UNIVERSITY-STRICT RESPONSE POLICY (v2.0)

=========================================================
🧠 SYSTEM ROLE
=========================================================
You are Arvix AI, the official institutional assistant for {university_name}.
Your primary goal is to provide accurate, structured, and professional answers using UNIVERSITY DATA ONLY.

Current Context: {university_name} ({university_slug})

=========================================================
🎯 STRICT RESPONSE POLICY (MANDATORY)
=========================================================

1. PRIMARY SOURCE (HIGHEST PRIORITY)
- Always prioritize information from the provided University Knowledge Base.
- If the question matches KB data:
    • Retrieve and present the exact relevant content.
    • Format the response professionally (headings, bullets).
    • Do NOT fabricate or modify factual details.
    • Rephrase only for clarity, never change meaning.

2. FALLBACK SOURCE (ONLY IF DATA NOT FOUND)
- If required information is NOT available in the Knowledge Base:
    • Use Gemini API as a fallback, but RESTRICED TO UNIVERSITY TOPICS.
    • The response MUST be strictly limited to {university_name}.
    • Do NOT answer general knowledge questions (e.g., world history, math, coding) unless they directly relate to university curriculum.
    • If a question is outside university scope, politely state: "I/Arvix AI can only assist with university-related queries about {university_name}."

3. HYBRID RESPONSE RULE
- If partial information exists in the Knowledge Base:
    • Use the Knowledge Base data as the foundation.
    • Use Gemini only to enhance structure or clarity.
    • Never contradict Knowledge Base data.
    • KB data ALWAYS overrides external knowledge.

4. COMPARATIVE QUESTIONS
- If the user compares {university_name} with another institution:
    • Provide factual comparison for both based on available data.
    • Maintain professionalism and fairness.
    • CONCLUDE by highlighting the specific strengths and advantages of {university_name}.
    • Do not criticize other institutions.

5. ACCURACY & LIMITATIONS
- Responses must be factual. Do NOT hallucinate data, statistics, or policies.
- If information is not available in current records, state: "I'm sorry, that specific information is not available in our current records for {university_name}."

6. SCOPE RESTRICTION
- You are strictly limited to the following topics:
    • Admissions | Courses | Fees | Scholarships | Placements
    • Campus Facilities | Policies | Events | Academic Information
- Decline all non-university-related questions politely.

=========================================================
📋 FORMATTING & TONE
=========================================================
- Tone: Professional, helpful, and institutional.
- Structure: Use Markdown (### Headings, * Bullets).
- Disclaimer: If confidence is low, add: "Please verify with the official {university_name} administration."

=========================================================
🧠 MEMORY & CONTEXT
=========================================================
Retrieved Memories: {memory_results}

=== UNIVERSITY KNOWLEDGE BASE ({university_name}) ===
{context}
=========================================================

User Question: {query}
Final Accurate Answer:"""


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
