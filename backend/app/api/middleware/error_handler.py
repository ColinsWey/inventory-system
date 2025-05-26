"""
Middleware для обработки ошибок.
"""

from typing import Callable
from fastapi import Request, Response, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from loguru import logger

from backend.app.shared.exceptions import AppException


class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    """Middleware для централизованной обработки ошибок."""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Обработка запроса с перехватом ошибок."""
        
        try:
            response = await call_next(request)
            return response
            
        except AppException as exc:
            # Обработка кастомных исключений приложения
            logger.error(f"Ошибка приложения: {exc.message}")
            return JSONResponse(
                status_code=exc.status_code,
                content={
                    "error": True,
                    "message": exc.message,
                    "code": exc.code
                }
            )
            
        except HTTPException as exc:
            # Обработка HTTP исключений FastAPI
            logger.error(f"HTTP ошибка: {exc.detail}")
            return JSONResponse(
                status_code=exc.status_code,
                content={
                    "error": True,
                    "message": exc.detail,
                    "code": f"HTTP_{exc.status_code}"
                }
            )
            
        except Exception as exc:
            # Обработка неожиданных ошибок
            logger.exception(f"Неожиданная ошибка: {str(exc)}")
            return JSONResponse(
                status_code=500,
                content={
                    "error": True,
                    "message": "Внутренняя ошибка сервера",
                    "code": "INTERNAL_ERROR"
                }
            ) 