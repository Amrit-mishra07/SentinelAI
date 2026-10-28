from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://user:password@db:5432/aipcsr"
    JWT_SECRET: str = "your-secret-key"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REDIS_URL: str = "redis://redis:6379"
    CORS_ORIGINS: list[str] = ["http://localhost", "http://localhost:3000"]
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    OPENAI_TIMEOUT_SECONDS: float = Field(default=45, gt=0, le=300)
    MAX_AI_FINDINGS_PER_SCAN: int = Field(default=25, ge=0, le=1000)
    REPORTS_DIR: str = "reports"
    SECRETS_ENCRYPTION_KEY: str = ""
    SCANNER_TIMEOUT_SECONDS: int = Field(default=300, gt=0, le=1800)
    CLONE_TIMEOUT_SECONDS: int = Field(default=120, gt=0, le=600)
    PUBLIC_BASE_URL: str = "http://localhost"
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    GITHUB_OAUTH_REDIRECT_URL: str = ""
    SMTP_HOST: str = ""
    SMTP_PORT: int = Field(default=587, ge=1, le=65535)
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = ""
    SMTP_USE_TLS: bool = True

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
