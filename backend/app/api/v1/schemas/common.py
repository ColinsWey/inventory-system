"""
Общие схемы данных для API.
"""

from typing import Optional, List, Any, Dict
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field


class PaginationParams(BaseModel):
    """Параметры пагинации."""
    page: int = Field(1, ge=1, description="Номер страницы")
    size: int = Field(20, ge=1, le=100, description="Размер страницы")
    
    @property
    def offset(self) -> int:
        return (self.page - 1) * self.size


class PaginatedResponse(BaseModel):
    """Ответ с пагинацией."""
    items: List[Any] = Field(description="Элементы")
    total: int = Field(description="Общее количество")
    page: int = Field(description="Текущая страница")
    size: int = Field(description="Размер страницы")
    pages: int = Field(description="Общее количество страниц")
    
    @classmethod
    def create(cls, items: List[Any], total: int, page: int, size: int):
        """Создание ответа с пагинацией."""
        pages = (total + size - 1) // size
        return cls(
            items=items,
            total=total,
            page=page,
            size=size,
            pages=pages
        )


class FilterParams(BaseModel):
    """Базовые параметры фильтрации."""
    search: Optional[str] = Field(None, description="Поиск по тексту")
    sort_by: Optional[str] = Field("created_at", description="Поле для сортировки")
    sort_order: Optional[str] = Field("desc", pattern="^(asc|desc)$", description="Порядок сортировки")


class SuccessResponse(BaseModel):
    """Стандартный ответ об успехе."""
    success: bool = True
    message: str = Field(description="Сообщение")
    data: Optional[Dict[str, Any]] = None


class ErrorResponse(BaseModel):
    """Стандартный ответ об ошибке."""
    success: bool = False
    error: str = Field(description="Код ошибки")
    message: str = Field(description="Описание ошибки")
    details: Optional[Dict[str, Any]] = None


class TimestampMixin(BaseModel):
    """Миксин для временных меток."""
    created_at: datetime = Field(description="Дата создания")
    updated_at: Optional[datetime] = Field(None, description="Дата обновления")


class UUIDMixin(BaseModel):
    """Миксин для UUID идентификатора."""
    id: UUID = Field(description="Уникальный идентификатор") 