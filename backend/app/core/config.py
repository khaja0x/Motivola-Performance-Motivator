# pyrefly: ignore [missing-import]
from pydantic_settings import BaseSettings, SettingsConfigDict
import logging

logger = logging.getLogger(__name__)

class Settings(BaseSettings):
    APP_NAME: str = "Motivola"
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    DEBUG: bool = False  # Default to False for production safety
    FRONTEND_URL: str = "http://localhost:3000"
    BACKEND_URL: str = "http://localhost:8000"

    # Twilio (Optional, used for WhatsApp updates)
    TWILIO_ACCOUNT_SID: str | None = None
    TWILIO_AUTH_TOKEN: str | None = None
    TWILIO_WHATSAPP_NUMBER: str | None = None

    # Redis (Optional)
    REDIS_URL: str | None = None

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    def log_config_summary(self):
        """Log a safe summary of the configuration on startup."""
        db_host = "***hidden***"
        try:
            # Extract just the host from the DB URL for logging
            parts = self.DATABASE_URL.split("@")
            if len(parts) > 1:
                db_host = parts[1].split("/")[0].split(":")[0]
        except Exception:
            pass
        
        origins = [o.strip() for o in self.FRONTEND_URL.split(",")]
        
        logger.info("=" * 50)
        logger.info(f"🚀 {self.APP_NAME} Configuration Summary")
        logger.info(f"   DEBUG: {self.DEBUG}")
        logger.info(f"   DB Host: {db_host}")
        logger.info(f"   CORS Origins: {origins}")
        logger.info(f"   Token Expiry: {self.ACCESS_TOKEN_EXPIRE_MINUTES} min")
        logger.info("=" * 50)

settings = Settings()
