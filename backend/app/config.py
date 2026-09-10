import os
from pathlib import Path
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Load .env file if it exists
backend_dir = Path(__file__).resolve().parent.parent
env_file = backend_dir / ".env"
load_dotenv(dotenv_path=env_file)

class Settings(BaseSettings):
    APP_NAME: str = "Voice Loan Application Assistant"
    APP_ENV: str = os.getenv("APP_ENV", "development")
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", 8000))
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./voice_loan.db")
    
    # Provider Keys
    SARVAM_API_KEY: str = os.getenv("SARVAM_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    # Default settings
    DEFAULT_LANGUAGE: str = os.getenv("DEFAULT_LANGUAGE", "hi-IN")
    FALLBACK_TO_MOCK: bool = os.getenv("FALLBACK_TO_MOCK", "true").lower() in ("1", "true", "yes")

    @property
    def has_sarvam(self) -> bool:
        return bool(self.SARVAM_API_KEY and self.SARVAM_API_KEY.strip())

    @property
    def has_gemini(self) -> bool:
        return bool(self.GEMINI_API_KEY and self.GEMINI_API_KEY.strip())

settings = Settings()
