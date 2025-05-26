"""
Схемы для авторизации и аутентификации.
"""

from typing import Optional
from pydantic import BaseModel, Field, field_validator
from enum import Enum
import re

from .common import UUIDMixin, TimestampMixin


class UserRole(str, Enum):
    """Роли пользователей."""
    ADMIN = "admin"
    MANAGER = "manager"
    OPERATOR = "operator"
    VIEWER = "viewer"


class LoginRequest(BaseModel):
    """Запрос на авторизацию."""
    username: str = Field(..., min_length=3, max_length=50, description="Имя пользователя")
    password: str = Field(..., min_length=3, description="Пароль")


class TokenResponse(BaseModel):
    """Ответ с токеном доступа."""
    access_token: str = Field(description="JWT токен доступа")
    token_type: str = Field(default="bearer", description="Тип токена")
    expires_in: int = Field(description="Время жизни токена в секундах")
    user: "UserInfo"


class UserInfo(BaseModel):
    """Информация о пользователе."""
    id: str = Field(description="ID пользователя")
    username: str = Field(description="Имя пользователя")
    email: str = Field(description="Email")
    first_name: Optional[str] = Field(None, description="Имя")
    last_name: Optional[str] = Field(None, description="Фамилия")
    role: UserRole = Field(description="Роль пользователя")
    is_active: bool = Field(description="Активен ли пользователь")

    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        """Валидация email с поддержкой .local доменов."""
        if not v or '@' not in v:
            raise ValueError('Email must contain @')
        
        # Паттерны для проверки
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        local_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.local$'
        
        if not (re.match(email_pattern, v) or re.match(local_pattern, v)):
            raise ValueError('Invalid email format')
        
        return v


class UserCreate(BaseModel):
    """Создание пользователя."""
    username: str = Field(..., min_length=3, max_length=50, description="Имя пользователя")
    email: str = Field(description="Email")
    password: str = Field(..., min_length=3, description="Пароль")
    first_name: Optional[str] = Field(None, max_length=100, description="Имя")
    last_name: Optional[str] = Field(None, max_length=100, description="Фамилия")
    role: UserRole = Field(default=UserRole.VIEWER, description="Роль пользователя")

    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        """Валидация email с поддержкой .local доменов."""
        if not v or '@' not in v:
            raise ValueError('Email must contain @')
        
        # Паттерны для проверки
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        local_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.local$'
        
        if not (re.match(email_pattern, v) or re.match(local_pattern, v)):
            raise ValueError('Invalid email format')
        
        return v


class UserUpdate(BaseModel):
    """Обновление пользователя."""
    email: Optional[str] = Field(None, description="Email")
    first_name: Optional[str] = Field(None, max_length=100, description="Имя")
    last_name: Optional[str] = Field(None, max_length=100, description="Фамилия")
    role: Optional[UserRole] = Field(None, description="Роль пользователя")
    is_active: Optional[bool] = Field(None, description="Активен ли пользователь")

    @field_validator('email')
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        """Валидация email с поддержкой .local доменов."""
        if not v:
            return v
        
        if '@' not in v:
            raise ValueError('Email must contain @')
        
        # Паттерны для проверки
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        local_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.local$'
        
        if not (re.match(email_pattern, v) or re.match(local_pattern, v)):
            raise ValueError('Invalid email format')
        
        return v


class PasswordChange(BaseModel):
    """Смена пароля."""
    current_password: str = Field(..., description="Текущий пароль")
    new_password: str = Field(..., min_length=3, description="Новый пароль")


class User(UUIDMixin, TimestampMixin, UserInfo):
    """Полная модель пользователя."""
    pass


# Обновляем forward reference
TokenResponse.model_rebuild() 