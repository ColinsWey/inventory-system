"""
Эндпоинты для авторизации и аутентификации.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database.connection import get_db
from app.api.v1.services.auth_service import AuthService
from app.api.v1.schemas.auth import (
    LoginRequest, TokenResponse, UserInfo, UserCreate, 
    UserUpdate, PasswordChange, User
)
from app.api.v1.schemas.common import SuccessResponse
from app.api.v1.dependencies import (
    get_current_active_user, require_admin, get_auth_service
)
from app.database.models import User as UserModel

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/login", response_model=TokenResponse, summary="Авторизация")
async def login(
    login_data: LoginRequest,
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Авторизация пользователя.
    
    - **username**: Имя пользователя
    - **password**: Пароль
    
    Возвращает JWT токен для доступа к API.
    """
    return auth_service.login(login_data)


@router.get("/me", response_model=UserInfo, summary="Информация о текущем пользователе")
async def get_current_user_info(
    current_user: UserModel = Depends(get_current_active_user)
):
    """
    Получение информации о текущем авторизованном пользователе.
    """
    return UserInfo(
        id=str(current_user.id),
        username=current_user.username,
        email=current_user.email,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        role=current_user.role,
        is_active=current_user.is_active
    )


@router.put("/me", response_model=UserInfo, summary="Обновление профиля")
async def update_current_user(
    user_data: UserUpdate,
    current_user: UserModel = Depends(get_current_active_user),
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Обновление профиля текущего пользователя.
    
    Пользователь может изменить только свои личные данные.
    Роль может изменить только администратор.
    """
    # Обычные пользователи не могут изменять роль
    if user_data.role is not None and current_user.role.value != "admin":
        user_data.role = None
    
    updated_user = auth_service.update_user(current_user.id, user_data)
    
    return UserInfo(
        id=str(updated_user.id),
        username=updated_user.username,
        email=updated_user.email,
        first_name=updated_user.first_name,
        last_name=updated_user.last_name,
        role=updated_user.role,
        is_active=updated_user.is_active
    )


@router.post("/change-password", response_model=SuccessResponse, summary="Смена пароля")
async def change_password(
    password_data: PasswordChange,
    current_user: UserModel = Depends(get_current_active_user),
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Смена пароля текущего пользователя.
    
    - **current_password**: Текущий пароль
    - **new_password**: Новый пароль
    """
    auth_service.change_password(
        current_user.id,
        password_data.current_password,
        password_data.new_password
    )
    
    return SuccessResponse(message="Пароль успешно изменен")


@router.post("/users", response_model=User, summary="Создание пользователя")
async def create_user(
    user_data: UserCreate,
    current_user: UserModel = Depends(require_admin),
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Создание нового пользователя.
    
    Доступно только администраторам.
    """
    new_user = auth_service.create_user(user_data)
    
    return User(
        id=new_user.id,
        username=new_user.username,
        email=new_user.email,
        first_name=new_user.first_name,
        last_name=new_user.last_name,
        role=new_user.role,
        is_active=new_user.is_active,
        created_at=new_user.created_at,
        updated_at=new_user.updated_at
    ) 