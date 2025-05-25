"""
Middleware для логирования HTTP запросов.
"""

import time
import uuid
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from loguru import logger


class LoggingMiddleware(BaseHTTPMiddleware):
    """Middleware для логирования всех HTTP запросов."""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Обработка запроса с логированием."""
        
        # Генерируем уникальный ID запроса
        request_id = str(uuid.uuid4())
        
        # Логируем входящий запрос
        start_time = time.time()
        logger.info(
            f"Запрос {request_id}: {request.method} {request.url.path} "
            f"от {request.client.host if request.client else 'unknown'}"
        )
        
        # Выполняем запрос
        response = await call_next(request)
        
        # Логируем ответ
        process_time = time.time() - start_time
        logger.info(
            f"Ответ {request_id}: {response.status_code} "
            f"за {process_time:.3f}с"
        )
        
        # Добавляем заголовки
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time"] = str(process_time)
        
        return response 