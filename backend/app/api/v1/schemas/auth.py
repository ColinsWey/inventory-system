"""
Схемы для авторизации и аутентификации.
"""

from typing import Optional
from pydantic import BaseModel, Field, EmailStr
from enum import Enum

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
    password: str = Field(..., min_length=6, description="Пароль")


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
    email: EmailStr = Field(description="Email")
    first_name: Optional[str] = Field(None, description="Имя")
    last_name: Optional[str] = Field(None, description="Фамилия")
    role: UserRole = Field(description="Роль пользователя")
    is_active: bool = Field(description="Активен ли пользователь")


class UserCreate(BaseModel):
    """Создание пользователя."""
    username: str = Field(..., min_length=3, max_length=50, description="Имя пользователя")
    email: EmailStr = Field(description="Email")
    password: str = Field(..., min_length=6, description="Пароль")
    first_name: Optional[str] = Field(None, max_length=100, description="Имя")
    last_name: Optional[str] = Field(None, max_length=100, description="Фамилия")
    role: UserRole = Field(default=UserRole.VIEWER, description="Роль пользователя")


class UserUpdate(BaseModel):
    """Обновление пользователя."""
    email: Optional[EmailStr] = Field(None, description="Email")
    first_name: Optional[str] = Field(None, max_length=100, description="Имя")
    last_name: Optional[str] = Field(None, max_length=100, description="Фамилия")
    role: Optional[UserRole] = Field(None, description="Роль пользователя")
    is_active: Optional[bool] = Field(None, description="Активен ли пользователь")


class PasswordChange(BaseModel):
    """Смена пароля."""
    current_password: str = Field(..., description="Текущий пароль")
    new_password: str = Field(..., min_length=6, description="Новый пароль")


class User(UUIDMixin, TimestampMixin, UserInfo):
    """Полная модель пользователя."""
    pass


# Обновляем forward reference
TokenResponse.model_rebuild() 