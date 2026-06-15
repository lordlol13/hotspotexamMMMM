import os
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Цифровая микроскопия"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"
    ENABLE_DOCS: bool = True

    DATABASE_URL: str = "postgresql://emergent:emergent_pass@localhost:5432/emergent_db"

    JWT_SECRET: str = "secret-key-change-me-in-production-super-long-hex-string"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALLOW_TEACHER_REGISTRATION: bool = True
    REQUIRE_EMAIL_VERIFICATION: bool = True

    BACKEND_CORS_ORIGINS: Union[List[str], str] = ["http://localhost:3000", "http://localhost:8000"]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    UPLOAD_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
    MAX_SLIDE_UPLOAD_BYTES: int = 20 * 1024 * 1024 * 1024
    MAX_MEDIA_UPLOAD_BYTES: int = 100 * 1024 * 1024
    TILE_CACHE_MAX_AGE_SECONDS: int = 86400
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_RECYCLE_SECONDS: int = 1800
    DB_POOL_TIMEOUT_SECONDS: int = 10

    ADMIN_EMAIL: str = "admin@edu.ru"
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "admin123"
    ADMIN_FULL_NAME: str = "System Admin"

    SMTP_HOST: str = "127.0.0.1"
    SMTP_PORT: int = 1025
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "noreply@edu.ru"
    FRONTEND_URL: str = "http://localhost:5173"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    def validate_production(self) -> None:
        if self.ENVIRONMENT != "production":
            return
        if self.JWT_SECRET.startswith("secret-key-change-me") or len(self.JWT_SECRET) < 32:
            raise RuntimeError("JWT_SECRET must be a unique production secret of at least 32 characters")
        if self.ADMIN_PASSWORD == "admin123":
            raise RuntimeError("ADMIN_PASSWORD must be changed in production")
        if any(origin.startswith("http://localhost") for origin in self.BACKEND_CORS_ORIGINS):
            raise RuntimeError("Production CORS origins cannot include localhost")

settings = Settings()
