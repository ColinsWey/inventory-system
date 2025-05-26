"""
Сервис для авторизации и аутентификации.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

import jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.core.config import settings
from app.database.models import User as UserModel
from app.api.v1.schemas.auth import UserCreate, UserUpdate, LoginRequest, TokenResponse, UserInfo

logger = logging.getLogger(__name__)

# Контекст для хеширования паролей
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthService:
    """Сервис для работы с авторизацией."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Проверка пароля."""
        return pwd_context.verify(plain_password, hashed_password)
    
    def get_password_hash(self, password: str) -> str:
        """Хеширование пароля."""
        return pwd_context.hash(password)
    
    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Создание JWT токена."""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        return encoded_jwt
    
    def verify_token(self, token: str) -> dict:
        """Проверка JWT токена."""
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            return payload
        except jwt.PyJWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Недействительный токен",
                headers={"WWW-Authenticate": "Bearer"},
            )
    
    def get_user_by_username(self, username: str) -> Optional[UserModel]:
        """Получение пользователя по имени."""
        return self.db.query(UserModel).filter(UserModel.username == username).first()
    
    def get_user_by_email(self, email: str) -> Optional[UserModel]:
        """Получение пользователя по email."""
        return self.db.query(UserModel).filter(UserModel.email == email).first()
    
    def get_user_by_id(self, user_id: UUID) -> Optional[UserModel]:
        """Получение пользователя по ID."""
        return self.db.query(UserModel).filter(UserModel.id == user_id).first()
    
    def authenticate_user(self, username: str, password: str) -> Optional[UserModel]:
        """Аутентификация пользователя."""
        user = self.get_user_by_username(username)
        if not user:
            return None
        if not self.verify_password(password, user.hashed_password):
            return None
        if not user.is_active:
            return None
        return user
    
    def login(self, login_data: LoginRequest) -> TokenResponse:
        """Авторизация пользователя."""
        user = self.authenticate_user(login_data.username, login_data.password)
        if not user:
            logger.warning(f"Неудачная попытка входа для пользователя: {login_data.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Неверное имя пользователя или пароль",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Обновляем время последнего входа
        user.last_login = datetime.utcnow()
        self.db.commit()
        
        # Создаем токен
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = self.create_access_token(
            data={"sub": str(user.id), "username": user.username, "role": user.role.value},
            expires_delta=access_token_expires
        )
        
        logger.info(f"Успешный вход пользователя: {user.username}")
        
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=UserInfo(
                id=str(user.id),
                username=user.username,
                email=user.email,
                first_name=user.first_name,
                last_name=user.last_name,
                role=user.role,
                is_active=user.is_active
            )
        )
    
    def create_user(self, user_data: UserCreate) -> UserModel:
        """Создание нового пользователя."""
        # Проверяем уникальность username
        if self.get_user_by_username(user_data.username):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Пользователь с таким именем уже существует"
            )
        
        # Проверяем уникальность email
        if self.get_user_by_email(user_data.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Пользователь с таким email уже существует"
            )
        
        # Создаем пользователя
        hashed_password = self.get_password_hash(user_data.password)
        db_user = UserModel(
            username=user_data.username,
            email=user_data.email,
            hashed_password=hashed_password,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            role=user_data.role
        )
        
        self.db.add(db_user)
        self.db.commit()
        self.db.refresh(db_user)
        
        logger.info(f"Создан новый пользователь: {db_user.username}")
        return db_user
    
    def update_user(self, user_id: UUID, user_data: UserUpdate) -> UserModel:
        """Обновление пользователя."""
        user = self.get_user_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Пользователь не найден"
            )
        
        # Проверяем уникальность email при изменении
        if user_data.email and user_data.email != user.email:
            if self.get_user_by_email(user_data.email):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Пользователь с таким email уже существует"
                )
        
        # Обновляем поля
        update_data = user_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(user, field, value)
        
        self.db.commit()
        self.db.refresh(user)
        
        logger.info(f"Обновлен пользователь: {user.username}")
        return user
    
    def change_password(self, user_id: UUID, current_password: str, new_password: str) -> bool:
        """Смена пароля пользователя."""
        user = self.get_user_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Пользователь не найден"
            )
        
        # Проверяем текущий пароль
        if not self.verify_password(current_password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Неверный текущий пароль"
            )
        
        # Устанавливаем новый пароль
        user.hashed_password = self.get_password_hash(new_password)
        self.db.commit()
        
        logger.info(f"Изменен пароль пользователя: {user.username}")
        return True
    
    def get_current_user(self, token: str) -> UserModel:
        """Получение текущего пользователя по токену."""
        payload = self.verify_token(token)
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Недействительный токен",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        user = self.get_user_by_id(UUID(user_id))
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Пользователь не найден",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Пользователь неактивен",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return user 