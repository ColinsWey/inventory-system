"""
Схемы для интеграции с внешними системами.
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from enum import Enum

from pydantic import BaseModel, Field


class SyncStatusEnum(str, Enum):
    """Статусы синхронизации."""
    IDLE = "idle"
    RUNNING = "running"
    SUCCESS = "success"
    ERROR = "error"
    PARTIAL = "partial"


class SyncStatus(BaseModel):
    """Статус синхронизации."""
    status: SyncStatusEnum
    last_sync: Optional[datetime]
    next_sync: Optional[datetime]
    items_synced: int = 0
    items_failed: int = 0
    error_message: Optional[str] = None


class SyncResult(BaseModel):
    """Результат синхронизации."""
    status: str
    message: str
    items_processed: int = 0
    items_updated: int = 0
    items_created: int = 0
    items_failed: int = 0
    errors: List[str] = []
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class IntegrationConfig(BaseModel):
    """Конфигурация интеграции."""
    salesdrive_enabled: bool = True
    salesdrive_api_url: str
    salesdrive_api_key: str
    sync_interval_minutes: int = Field(60, ge=5, le=1440)
    auto_sync_enabled: bool = True
    sync_categories: List[str] = []
    field_mapping: Dict[str, str] = {}


class SalesDriveItem(BaseModel):
    """Товар из SalesDrive API."""
    id: str
    name: str
    sku: str
    category: str
    price: float
    quantity: int
    description: Optional[str] = None
    supplier: Optional[str] = None
    updated_at: datetime


class SyncHistoryEntry(BaseModel):
    """Запись истории синхронизации."""
    id: int
    sync_type: str
    status: SyncStatusEnum
    started_at: datetime
    completed_at: Optional[datetime]
    items_processed: int
    items_updated: int
    items_created: int
    items_failed: int
    error_message: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


class ConnectionTestResult(BaseModel):
    """Результат тестирования соединения."""
    success: bool
    message: str
    response_time_ms: Optional[int] = None
    api_version: Optional[str] = None
    tested_at: datetime 