"""
Кастомные исключения приложения.
"""

from typing import Optional


class AppException(Exception):
    """Базовое исключение приложения."""
    
    def __init__(
        self,
        message: str,
        code: str,
        status_code: int = 400
    ):
        self.message = message
        self.code = code
        self.status_code = status_code
        super().__init__(self.message)


class ValidationError(AppException):
    """Ошибка валидации данных."""
    
    def __init__(self, message: str, field: Optional[str] = None):
        code = f"VALIDATION_ERROR_{field.upper()}" if field else "VALIDATION_ERROR"
        super().__init__(message, code, 422)


class NotFoundError(AppException):
    """Ошибка - ресурс не найден."""
    
    def __init__(self, resource: str, identifier: str):
        message = f"{resource} с ID {identifier} не найден"
        super().__init__(message, "NOT_FOUND", 404)


class AuthenticationError(AppException):
    """Ошибка аутентификации."""
    
    def __init__(self, message: str = "Неверные учетные данные"):
        super().__init__(message, "AUTHENTICATION_ERROR", 401)


class AuthorizationError(AppException):
    """Ошибка авторизации."""
    
    def __init__(self, message: str = "Недостаточно прав доступа"):
        super().__init__(message, "AUTHORIZATION_ERROR", 403)


class BusinessLogicError(AppException):
    """Ошибка бизнес-логики."""
    
    def __init__(self, message: str):
        super().__init__(message, "BUSINESS_LOGIC_ERROR", 400)


class ExternalServiceError(AppException):
    """Ошибка внешнего сервиса."""
    
    def __init__(self, service: str, message: str):
        full_message = f"Ошибка сервиса {service}: {message}"
        super().__init__(full_message, "EXTERNAL_SERVICE_ERROR", 502)


class DatabaseError(AppException):
    """Ошибка базы данных."""
    
    def __init__(self, message: str):
        super().__init__(message, "DATABASE_ERROR", 500) 