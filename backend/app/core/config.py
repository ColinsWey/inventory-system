"""
Конфигурация приложения.
"""

from typing import List, Optional
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
import os


class Settings(BaseSettings):
    """Настройки приложения."""
    
    # Основные настройки
    APP_NAME: str = "Inventory Management System"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    ENVIRONMENT: str = "development"
    API_V1_STR: str = "/api/v1"
    
    # База данных
    DATABASE_URL: str = "postgresql://postgres:postgres@db:5432/inventory_system"
    DATABASE_HOST: str = "db"
    DATABASE_PORT: int = 5432
    DATABASE_NAME: str = "inventory_system"
    DATABASE_USER: str = "postgres"
    DATABASE_PASSWORD: str = "postgres"
    
    # Redis
    REDIS_URL: str = "redis://redis:6379"
    
    # JWT
    SECRET_KEY: str = "your_super_secret_jwt_key_here"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v):
        if isinstance(v, str):
            return [i.strip() for i in v.split(",")]
        return v
    
    # SalesDrive API
    SALESDRIVE_API_URL: str = "https://api.salesdrive.ru"
    SALESDRIVE_API_KEY: str = "2gXtjXXdqB8Ih9ALlHk3eGerWhY52Dz9b-JQ52vXqt0uFvdcWQRj2kTeROb3r42Nib_r0OLrKKGMAQads NobSajn_ZKWCxzpuzas"
    SALESDRIVE_TIMEOUT: int = 30
    SALESDRIVE_MAX_RETRIES: int = 3
    SALESDRIVE_RATE_LIMIT_DELAY: float = 1.0
    SALESDRIVE_WEBHOOK_SECRET: str = ""
    SALESDRIVE_AUTO_SYNC_ENABLED: bool = False
    SALESDRIVE_SYNC_INTERVAL_MINUTES: int = 60
    
    # Логирование
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "logs/app.log"
    
    # Прогнозирование
    FORECAST_DAYS_AHEAD: int = 30
    MIN_HISTORY_DAYS: int = 90
    
    # Файлы
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE: int = 10485760  # 10MB
    
    # Кеширование
    CACHE_TTL: int = 3600  # 1 час
    CACHE_PREFIX: str = "inventory:"
    
    # Email
    EMAIL_SMTP_HOST: Optional[str] = None
    EMAIL_SMTP_PORT: int = 587
    EMAIL_USERNAME: Optional[str] = None
    EMAIL_PASSWORD: Optional[str] = None
    EMAIL_FROM: Optional[str] = None
    
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True
    )


# Создание экземпляра настроек
settings = Settings() 