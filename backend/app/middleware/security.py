from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
import re
import html

DANGEROUS_PATTERNS = [
    r"<script",
    r"javascript:",
    r"on\w+\s*=",
    r"\bSELECT\b.*\bFROM\b",
    r"\bDROP\b",
    r"\{\{.*\}\}",
    r"\{%.*%\}",
]


def sanitize_input(text: str) -> str:
    text = html.escape(text)
    for pattern in DANGEROUS_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            text = re.sub(pattern, "[removed]", text, flags=re.IGNORECASE)
    return text.strip()


class SecurityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        try:
            del response.headers["server"]
        except (KeyError, AttributeError):
            pass
        return response