"""
Схемы для работы с категориями товаров.
"""

from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field

from .common import UUIDMixin, TimestampMixin


class CategoryBase(BaseModel):
    """Базовая модель категории."""
    name: str = Field(..., min_length=1, max_length=100, description="Название категории")
    description: Optional[str] = Field(None, description="Описание категории")
    parent_id: Optional[UUID] = Field(None, description="ID родительской категории")
    sort_order: int = Field(default=0, description="Порядок сортировки")
    is_active: bool = Field(default=True, description="Активна ли категория")


class CategoryCreate(CategoryBase):
    """Создание категории."""
    pass


class CategoryUpdate(BaseModel):
    """Обновление категории."""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="Название категории")
    description: Optional[str] = Field(None, description="Описание категории")
    parent_id: Optional[UUID] = Field(None, description="ID родительской категории")
    sort_order: Optional[int] = Field(None, description="Порядок сортировки")
    is_active: Optional[bool] = Field(None, description="Активна ли категория")


class Category(UUIDMixin, TimestampMixin, CategoryBase):
    """Полная модель категории."""
    children: List["Category"] = Field(default=[], description="Дочерние категории")
    products_count: int = Field(default=0, description="Количество товаров в категории")


class CategoryTree(UUIDMixin):
    """Дерево категорий."""
    name: str = Field(description="Название категории")
    description: Optional[str] = Field(None, description="Описание категории")
    sort_order: int = Field(description="Порядок сортировки")
    is_active: bool = Field(description="Активна ли категория")
    products_count: int = Field(default=0, description="Количество товаров в категории")
    children: List["CategoryTree"] = Field(default=[], description="Дочерние категории")


class CategoryListItem(UUIDMixin, TimestampMixin):
    """Элемент списка категорий."""
    name: str = Field(description="Название категории")
    description: Optional[str] = Field(None, description="Описание категории")
    parent_id: Optional[UUID] = Field(None, description="ID родительской категории")
    sort_order: int = Field(description="Порядок сортировки")
    is_active: bool = Field(description="Активна ли категория")
    products_count: int = Field(default=0, description="Количество товаров в категории")
    level: int = Field(default=0, description="Уровень вложенности")


# Обновляем forward references
Category.model_rebuild()
CategoryTree.model_rebuild() 