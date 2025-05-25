"""
Схемы для импорта данных.
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field
from enum import Enum

from .common import UUIDMixin, TimestampMixin
from .product import ProductImport


class SyncStatus(str, Enum):
    """Статусы синхронизации."""
    IDLE = "idle"
    RUNNING = "running"
    SUCCESS = "success"
    ERROR = "error"
    PARTIAL = "partial"


class ImportSource(str, Enum):
    """Источники импорта."""
    SALESDRIVE = "salesdrive"
    EXCEL = "excel"
    CSV = "csv"
    MANUAL = "manual"


class ImportRequest(BaseModel):
    """Запрос на импорт."""
    source: ImportSource = Field(..., description="Источник импорта")
    auto_create_categories: bool = Field(default=True, description="Автоматически создавать категории")
    auto_create_suppliers: bool = Field(default=True, description="Автоматически создавать поставщиков")
    update_existing: bool = Field(default=True, description="Обновлять существующие товары")
    dry_run: bool = Field(default=False, description="Тестовый запуск без сохранения")


class SalesDriveImportRequest(ImportRequest):
    """Запрос на импорт из SalesDrive."""
    source: ImportSource = Field(default=ImportSource.SALESDRIVE, description="Источник импорта")
    sync_inventory: bool = Field(default=True, description="Синхронизировать остатки")
    sync_prices: bool = Field(default=True, description="Синхронизировать цены")
    category_mapping: Optional[Dict[str, UUID]] = Field(None, description="Маппинг категорий")
    supplier_mapping: Optional[Dict[str, UUID]] = Field(None, description="Маппинг поставщиков")


class ExcelImportRequest(ImportRequest):
    """Запрос на импорт из Excel."""
    source: ImportSource = Field(default=ImportSource.EXCEL, description="Источник импорта")
    sheet_name: Optional[str] = Field(None, description="Название листа")
    header_row: int = Field(default=1, description="Номер строки с заголовками")
    column_mapping: Dict[str, str] = Field(..., description="Маппинг колонок")


class ImportResult(BaseModel):
    """Результат импорта."""
    total_items: int = Field(description="Общее количество элементов")
    processed_items: int = Field(description="Обработано элементов")
    created_items: int = Field(description="Создано элементов")
    updated_items: int = Field(description="Обновлено элементов")
    failed_items: int = Field(description="Ошибок при обработке")
    errors: List[str] = Field(default=[], description="Список ошибок")
    warnings: List[str] = Field(default=[], description="Список предупреждений")


class ImportStatus(UUIDMixin, TimestampMixin):
    """Статус импорта."""
    source: ImportSource = Field(description="Источник импорта")
    status: SyncStatus = Field(description="Статус синхронизации")
    progress: int = Field(default=0, ge=0, le=100, description="Прогресс в процентах")
    result: Optional[ImportResult] = Field(None, description="Результат импорта")
    error_message: Optional[str] = Field(None, description="Сообщение об ошибке")
    started_by: UUID = Field(description="ID пользователя, запустившего импорт")
    started_at: datetime = Field(description="Время начала импорта")
    completed_at: Optional[datetime] = Field(None, description="Время завершения импорта")


class BulkImportRequest(BaseModel):
    """Массовый импорт товаров."""
    products: List[ProductImport] = Field(..., min_items=1, description="Список товаров для импорта")
    auto_create_categories: bool = Field(default=True, description="Автоматически создавать категории")
    auto_create_suppliers: bool = Field(default=True, description="Автоматически создавать поставщиков")
    update_existing: bool = Field(default=True, description="Обновлять существующие товары")


class ImportValidationError(BaseModel):
    """Ошибка валидации при импорте."""
    row: int = Field(description="Номер строки")
    field: str = Field(description="Поле с ошибкой")
    value: Any = Field(description="Значение с ошибкой")
    error: str = Field(description="Описание ошибки")


class ImportPreview(BaseModel):
    """Предварительный просмотр импорта."""
    total_rows: int = Field(description="Общее количество строк")
    valid_rows: int = Field(description="Количество валидных строк")
    invalid_rows: int = Field(description="Количество невалидных строк")
    sample_data: List[Dict[str, Any]] = Field(description="Образец данных")
    validation_errors: List[ImportValidationError] = Field(description="Ошибки валидации")
    column_mapping: Dict[str, str] = Field(description="Маппинг колонок")


class SalesDriveConfig(BaseModel):
    """Конфигурация SalesDrive."""
    api_url: str = Field(..., description="URL API SalesDrive")
    api_key: str = Field(..., description="API ключ")
    sync_interval: int = Field(default=60, description="Интервал синхронизации в минутах")
    auto_sync: bool = Field(default=True, description="Автоматическая синхронизация")
    timeout: int = Field(default=30, description="Таймаут запросов в секундах")


class SalesDriveProduct(BaseModel):
    """Товар из SalesDrive."""
    id: str = Field(description="ID товара в SalesDrive")
    name: str = Field(description="Название товара")
    sku: str = Field(description="Артикул товара")
    barcode: Optional[str] = Field(None, description="Штрихкод")
    category: Optional[str] = Field(None, description="Категория")
    supplier: Optional[str] = Field(None, description="Поставщик")
    description: Optional[str] = Field(None, description="Описание")
    price: float = Field(description="Цена")
    cost: Optional[float] = Field(None, description="Себестоимость")
    quantity: int = Field(default=0, description="Количество")
    unit: str = Field(default="шт", description="Единица измерения")
    updated_at: datetime = Field(description="Дата обновления в SalesDrive") 