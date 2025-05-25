"""
Роутер для аутентификации и авторизации.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from app.features.auth.schemas import Token, UserCreate, UserResponse
from app.features.auth.service import AuthService
from app.shared.exceptions import AuthenticationError

router = APIRouter()

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Аутентификация пользователя."""
    try:
        auth_service = AuthService()
        token = await auth_service.authenticate_user(
            username=form_data.username,
            password=form_data.password
        )
        return token
    except AuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=e.message,
            headers={"WWW-Authenticate": "Bearer"},
        )

@router.post("/register", response_model=UserResponse)
async def register(user_data: UserCreate):
    """Регистрация нового пользователя."""
    auth_service = AuthService()
    user = await auth_service.create_user(user_data)
    return user

@router.get("/me", response_model=UserResponse)
async def get_current_user():
    """Получение информации о текущем пользователе."""
    # TODO: Реализовать получение текущего пользователя
    return {"id": 1, "username": "admin", "email": "admin@example.com"}

@router.post("/refresh", response_model=Token)
async def refresh_token():
    """Обновление токена доступа."""
    # TODO: Реализовать обновление токена
    return {"access_token": "new_token", "token_type": "bearer"} 