"""
Схемы для работы с товарами.
"""

from typing import Optional, List, Dict, Any
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel, Field, validator
from enum import Enum

from .common import UUIDMixin, TimestampMixin, FilterParams


class ProductStatus(str, Enum):
    """Статусы товаров."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    DISCONTINUED = "discontinued"


class StockStatus(str, Enum):
    """Статусы остатков."""
    IN_STOCK = "in_stock"
    LOW_STOCK = "low_stock"
    OUT_OF_STOCK = "out_of_stock"
    RESERVED = "reserved"


class ProductTag(UUIDMixin):
    """Тег товара."""
    name: str = Field(description="Название тега")
    color: str = Field(description="Цвет тега в HEX")
    description: Optional[str] = Field(None, description="Описание тега")


class ProductCategory(UUIDMixin):
    """Категория товара."""
    name: str = Field(description="Название категории")
    description: Optional[str] = Field(None, description="Описание категории")
    parent_id: Optional[UUID] = Field(None, description="ID родительской категории")


class ProductSupplier(UUIDMixin):
    """Поставщик товара."""
    name: str = Field(description="Название поставщика")
    code: Optional[str] = Field(None, description="Код поставщика")
    contact_person: Optional[str] = Field(None, description="Контактное лицо")
    email: Optional[str] = Field(None, description="Email")
    phone: Optional[str] = Field(None, description="Телефон")
    rating: Optional[Decimal] = Field(None, description="Рейтинг поставщика")


class InventoryInfo(BaseModel):
    """Информация об остатках."""
    location: str = Field(description="Локация склада")
    quantity: int = Field(description="Количество")
    reserved_quantity: int = Field(default=0, description="Зарезервированное количество")
    min_quantity: int = Field(description="Минимальное количество")
    max_quantity: Optional[int] = Field(None, description="Максимальное количество")
    reorder_point: Optional[int] = Field(None, description="Точка перезаказа")
    stock_status: StockStatus = Field(description="Статус остатков")


class ProductBase(BaseModel):
    """Базовая модель товара."""
    name: str = Field(..., min_length=1, max_length=255, description="Название товара")
    sku: str = Field(..., min_length=1, max_length=100, description="Артикул товара")
    barcode: Optional[str] = Field(None, max_length=100, description="Штрихкод")
    category_id: Optional[UUID] = Field(None, description="ID категории")
    supplier_id: Optional[UUID] = Field(None, description="ID поставщика")
    description: Optional[str] = Field(None, description="Описание товара")
    specifications: Optional[Dict[str, Any]] = Field(None, description="Технические характеристики")
    unit_price: Decimal = Field(..., ge=0, description="Цена за единицу")
    cost_price: Optional[Decimal] = Field(None, ge=0, description="Себестоимость")
    weight: Optional[Decimal] = Field(None, ge=0, description="Вес в кг")
    dimensions: Optional[Dict[str, Any]] = Field(None, description="Габариты")
    unit_of_measure: str = Field(default="шт", max_length=20, description="Единица измерения")
    status: ProductStatus = Field(default=ProductStatus.ACTIVE, description="Статус товара")
    is_serialized: bool = Field(default=False, description="Серийный товар")
    warranty_months: int = Field(default=0, ge=0, description="Гарантия в месяцах")

    @validator('unit_price', 'cost_price')
    def validate_prices(cls, v):
        if v is not None and v < 0:
            raise ValueError('Цена не может быть отрицательной')
        return v


class ProductCreate(ProductBase):
    """Создание товара."""
    tag_ids: Optional[List[UUID]] = Field(None, description="ID тегов товара")


class ProductUpdate(BaseModel):
    """Обновление товара."""
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="Название товара")
    barcode: Optional[str] = Field(None, max_length=100, description="Штрихкод")
    category_id: Optional[UUID] = Field(None, description="ID категории")
    supplier_id: Optional[UUID] = Field(None, description="ID поставщика")
    description: Optional[str] = Field(None, description="Описание товара")
    specifications: Optional[Dict[str, Any]] = Field(None, description="Технические характеристики")
    unit_price: Optional[Decimal] = Field(None, ge=0, description="Цена за единицу")
    cost_price: Optional[Decimal] = Field(None, ge=0, description="Себестоимость")
    weight: Optional[Decimal] = Field(None, ge=0, description="Вес в кг")
    dimensions: Optional[Dict[str, Any]] = Field(None, description="Габариты")
    unit_of_measure: Optional[str] = Field(None, max_length=20, description="Единица измерения")
    status: Optional[ProductStatus] = Field(None, description="Статус товара")
    is_serialized: Optional[bool] = Field(None, description="Серийный товар")
    warranty_months: Optional[int] = Field(None, ge=0, description="Гарантия в месяцах")
    tag_ids: Optional[List[UUID]] = Field(None, description="ID тегов товара")


class Product(UUIDMixin, TimestampMixin, ProductBase):
    """Полная модель товара."""
    category: Optional[ProductCategory] = Field(None, description="Категория товара")
    supplier: Optional[ProductSupplier] = Field(None, description="Поставщик товара")
    tags: List[ProductTag] = Field(default=[], description="Теги товара")
    inventory: List[InventoryInfo] = Field(default=[], description="Информация об остатках")


class ProductListItem(UUIDMixin, TimestampMixin):
    """Элемент списка товаров."""
    name: str = Field(description="Название товара")
    sku: str = Field(description="Артикул товара")
    unit_price: Decimal = Field(description="Цена за единицу")
    status: ProductStatus = Field(description="Статус товара")
    category: Optional[ProductCategory] = Field(None, description="Категория товара")
    supplier: Optional[ProductSupplier] = Field(None, description="Поставщик товара")
    tags: List[ProductTag] = Field(default=[], description="Теги товара")
    total_quantity: int = Field(default=0, description="Общее количество на складах")
    stock_status: StockStatus = Field(description="Общий статус остатков")


class ProductFilters(FilterParams):
    """Фильтры для списка товаров."""
    category_id: Optional[UUID] = Field(None, description="Фильтр по категории")
    supplier_id: Optional[UUID] = Field(None, description="Фильтр по поставщику")
    status: Optional[ProductStatus] = Field(None, description="Фильтр по статусу")
    stock_status: Optional[StockStatus] = Field(None, description="Фильтр по статусу остатков")
    tag_ids: Optional[List[UUID]] = Field(None, description="Фильтр по тегам")
    min_price: Optional[Decimal] = Field(None, ge=0, description="Минимальная цена")
    max_price: Optional[Decimal] = Field(None, ge=0, description="Максимальная цена")
    low_stock: Optional[bool] = Field(None, description="Только товары с низким остатком")
    out_of_stock: Optional[bool] = Field(None, description="Только товары без остатков")


class ProductBulkUpdate(BaseModel):
    """Массовое обновление товаров."""
    product_ids: List[UUID] = Field(..., min_items=1, description="ID товаров для обновления")
    updates: ProductUpdate = Field(..., description="Данные для обновления")


class ProductImport(BaseModel):
    """Импорт товара."""
    external_id: str = Field(..., description="Внешний ID товара")
    name: str = Field(..., description="Название товара")
    sku: str = Field(..., description="Артикул товара")
    barcode: Optional[str] = Field(None, description="Штрихкод")
    category_name: Optional[str] = Field(None, description="Название категории")
    supplier_name: Optional[str] = Field(None, description="Название поставщика")
    description: Optional[str] = Field(None, description="Описание товара")
    unit_price: Decimal = Field(..., ge=0, description="Цена за единицу")
    cost_price: Optional[Decimal] = Field(None, ge=0, description="Себестоимость")
    quantity: int = Field(default=0, ge=0, description="Количество на складе") 