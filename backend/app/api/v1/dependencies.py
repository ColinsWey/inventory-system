"""
Зависимости для API v1.
"""

from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.database.connection import get_db
from app.api.v1.services.auth_service import AuthService
from app.api.v1.schemas.auth import UserRole
from app.database.models import User as UserModel

# Схема безопасности
security = HTTPBearer()


def get_auth_service(db: Session = Depends(get_db)) -> AuthService:
    """Получение сервиса авторизации."""
    return AuthService(db)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    auth_service: AuthService = Depends(get_auth_service)
) -> UserModel:
    """Получение текущего пользователя."""
    token = credentials.credentials
    return auth_service.get_current_user(token)


def get_current_active_user(
    current_user: UserModel = Depends(get_current_user)
) -> UserModel:
    """Получение текущего активного пользователя."""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь неактивен"
        )
    return current_user


class RoleChecker:
    """Проверка роли пользователя."""
    
    def __init__(self, allowed_roles: list[UserRole]):
        self.allowed_roles = allowed_roles
    
    def __call__(self, current_user: UserModel = Depends(get_current_active_user)):
        if current_user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Недостаточно прав доступа"
            )
        return current_user


# Предопределенные проверки ролей
require_admin = RoleChecker([UserRole.ADMIN])
require_manager = RoleChecker([UserRole.ADMIN, UserRole.MANAGER])
require_operator = RoleChecker([UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR])
require_viewer = RoleChecker([UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR, UserRole.VIEWER])


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    auth_service: AuthService = Depends(get_auth_service)
) -> Optional[UserModel]:
    """Получение пользователя (опционально)."""
    if not credentials:
        return None
    
    try:
        token = credentials.credentials
        return auth_service.get_current_user(token)
    except HTTPException:
        return None 