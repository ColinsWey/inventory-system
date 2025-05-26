"""
Главный модуль FastAPI приложения для системы управления товарными остатками.
"""

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from app.core.config import settings
from app.api.v1.router import api_router
from app.core.database.init_db import init_database
# from app.api.middleware.logging import LoggingMiddleware
# from app.api.middleware.error_handler import ErrorHandlerMiddleware

# Настройка логирования
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

# Инициализация базы данных при запуске
try:
    logger.info("Инициализация базы данных...")
    init_database()
    logger.info("База данных инициализирована успешно")
except Exception as e:
    logger.error(f"Ошибка инициализации базы данных: {e}")

# Создание экземпляра приложения
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Система управления товарными остатками с интеграцией SalesDrive API",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middleware для безопасности
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["localhost", "127.0.0.1", "0.0.0.0"]
)

# Кастомные middleware (добавим позже)
# app.add_middleware(LoggingMiddleware)
# app.add_middleware(ErrorHandlerMiddleware)

# Подключение роутеров
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
    """Корневой эндпоинт для проверки работы API."""
    return {
        "message": "Система управления товарными остатками",
        "version": settings.APP_VERSION,
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    """Проверка состояния приложения."""
    return {"status": "healthy", "version": settings.APP_VERSION}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    ) 