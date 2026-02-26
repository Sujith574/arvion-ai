from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
import os

class Settings(BaseSettings):
    # Firebase
    FIREBASE_PROJECT_ID: str
    FIREBASE_SERVICE_ACCOUNT_PATH: str = "serviceAccountKey.json"

    # JWT (Strictly required for startup)
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # AI Keys (With defaults to prevent complete startup failure)
    PROLIXIS_API_KEY: str = ""
    PROLIXIS_BASE_URL: str = "https://api.prolixis.ai/v1"
    GEMINI_API_KEY: str = ""

    # Email
    SMTP_FROM_EMAIL: str = ""
    SMTP_APP_PASSWORD: str = ""

    # Embedding config
    EMBEDDING_MODEL: str = "/app/model_cache"
    DEFAULT_CONFIDENCE_THRESHOLD: float = 0.75
    RATE_LIMIT_PER_MINUTE: int = 20

    # Frontend
    FRONTEND_URL: str = "https://arvion-frontend-noaidrnbfa-uc.a.run.app"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True
    )

@lru_cache()
def get_settings() -> Settings:
    return Settings()