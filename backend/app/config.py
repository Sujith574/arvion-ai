from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Firebase
    FIREBASE_PROJECT_ID: str = "arvion-241094"
    FIREBASE_SERVICE_ACCOUNT_PATH: str = "serviceAccountKey.json"

    # JWT
    JWT_SECRET_KEY: str = "arvion-super-secret-jwt-key-change-in-production-2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # Prolixis Continuum — primary AI memory + LLM layer
    PROLIXIS_API_KEY: str = ""
    PROLIXIS_BASE_URL: str = "https://api.prolixis.in"

    # Gemini AI
    GEMINI_API_KEY: str = ""

    # Email (Gmail SMTP) for OTP verification
    SMTP_FROM_EMAIL: str = ""
    SMTP_APP_PASSWORD: str = ""

    # Embedding model (local, for FAISS knowledge-base search)
    EMBEDDING_MODEL: str = "/app/model_cache"
    DEFAULT_CONFIDENCE_THRESHOLD: float = 0.75

    # Rate limiting
    RATE_LIMIT_PER_MINUTE: int = 20

    # Frontend origin (for CORS)
    FRONTEND_URL: str = "https://arvion-frontend-noaidrnbfa-uc.a.run.app"

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()