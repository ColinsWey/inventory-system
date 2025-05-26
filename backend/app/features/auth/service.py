"""
Сервис аутентификации и авторизации.
"""

from datetime import datetime, timedelta
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from backend.app.core.config import settings
from backend.app.features.auth.schemas import Token, UserCreate, UserResponse, UserInDB
from backend.app.shared.exceptions import AuthenticationError


class AuthService:
    """Сервис для работы с аутентификацией."""
    
    def __init__(self):
        self.pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Проверка пароля."""
        return self.pwd_context.verify(plain_password, hashed_password)
    
    def get_password_hash(self, password: str) -> str:
        """Хеширование пароля."""
        return self.pwd_context.hash(password)
    
    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Создание JWT токена."""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
        return encoded_jwt
    
    async def authenticate_user(self, username: str, password: str) -> Token:
        """Аутентификация пользователя."""
        # TODO: Получить пользователя из базы данных
        # Временная заглушка для демонстрации
        if username == "admin" and password == "admin":
            access_token_expires = timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
            access_token = self.create_access_token(
                data={"sub": username}, expires_delta=access_token_expires
            )
            return Token(
                access_token=access_token,
                token_type="bearer",
                expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60
            )
        else:
            raise AuthenticationError("Неверное имя пользователя или пароль")
    
    async def create_user(self, user_data: UserCreate) -> UserResponse:
        """Создание нового пользователя."""
        # TODO: Реализовать создание пользователя в базе данных
        hashed_password = self.get_password_hash(user_data.password)
        
        # Временная заглушка
        return UserResponse(
            id=1,
            username=user_data.username,
            email=user_data.email,
            is_active=True
        )
    
    async def get_current_user(self, token: str) -> UserInDB:
        """Получение текущего пользователя по токену."""
        try:
            payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
            username: str = payload.get("sub")
            if username is None:
                raise AuthenticationError("Недействительный токен")
        except JWTError:
            raise AuthenticationError("Недействительный токен")
        
        # TODO: Получить пользователя из базы данных
        # Временная заглушка
        return UserInDB(
            id=1,
            username=username,
            email="admin@example.com",
            is_active=True,
            hashed_password="hashed_password"
        ) 