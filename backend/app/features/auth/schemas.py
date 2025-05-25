"""
Схемы для аутентификации и авторизации.
"""

from typing import Optional
from pydantic import BaseModel, EmailStr


class Token(BaseModel):
    """Схема токена доступа."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenData(BaseModel):
    """Данные токена."""
    username: Optional[str] = None


class UserBase(BaseModel):
    """Базовая схема пользователя."""
    username: str
    email: EmailStr
    is_active: bool = True


class UserCreate(UserBase):
    """Схема создания пользователя."""
    password: str


class UserUpdate(BaseModel):
    """Схема обновления пользователя."""
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    """Схема ответа с данными пользователя."""
    id: int
    
    class Config:
        from_attributes = True


class UserInDB(UserBase):
    """Схема пользователя в базе данных."""
    id: int
    hashed_password: str
    
    class Config:
        from_attributes = True 