"""
Схемы для товарных остатков.
"""

from datetime import datetime
from typing import List, Optional
from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, Field, ConfigDict


class InventoryStatus(str, Enum):
    """Статусы товарных остатков."""
    IN_STOCK = "in_stock"      # В наличии
    LOW_STOCK = "low_stock"    # Мало на складе
    OUT_OF_STOCK = "out_of_stock"  # Нет в наличии
    DISCONTINUED = "discontinued"   # Снят с производства


class InventoryItemBase(BaseModel):
    """Базовая схема товарного остатка."""
    name: str = Field(..., min_length=1, max_length=255)
    sku: str = Field(..., min_length=1, max_length=100)
    category: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)
    unit_price: Decimal = Field(..., ge=0)
    quantity: int = Field(..., ge=0)
    min_quantity: int = Field(0, ge=0)
    max_quantity: Optional[int] = Field(None, ge=0)
    location: Optional[str] = Field(None, max_length=100)
    supplier: Optional[str] = Field(None, max_length=255)


class InventoryItemCreate(InventoryItemBase):
    """Схема создания товарного остатка."""
    pass


class InventoryItemUpdate(BaseModel):
    """Схема обновления товарного остатка."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    sku: Optional[str] = Field(None, min_length=1, max_length=100)
    category: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)
    unit_price: Optional[Decimal] = Field(None, ge=0)
    quantity: Optional[int] = Field(None, ge=0)
    min_quantity: Optional[int] = Field(None, ge=0)
    max_quantity: Optional[int] = Field(None, ge=0)
    location: Optional[str] = Field(None, max_length=100)
    supplier: Optional[str] = Field(None, max_length=255)


class InventoryItem(InventoryItemBase):
    """Схема товарного остатка."""
    id: int
    status: InventoryStatus
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class InventoryFilter(BaseModel):
    """Фильтры для поиска товарных остатков."""
    search: Optional[str] = None
    category: Optional[str] = None
    status: Optional[InventoryStatus] = None
    min_quantity: Optional[int] = None
    max_quantity: Optional[int] = None
    supplier: Optional[str] = None


class InventoryResponse(BaseModel):
    """Ответ со списком товарных остатков."""
    items: List[InventoryItem]
    total: int
    page: int
    per_page: int
    pages: int


class ForecastData(BaseModel):
    """Данные прогноза."""
    date: datetime
    predicted_quantity: int
    confidence: float = Field(..., ge=0, le=1)


class InventoryForecast(BaseModel):
    """Прогноз товарного остатка."""
    item_id: int
    forecast_days: int
    forecast_data: List[ForecastData]
    recommendations: List[str] 