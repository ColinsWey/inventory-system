"""
Роутер для интеграции с внешними системами.
"""

from typing import Optional
from fastapi import APIRouter, BackgroundTasks

from app.features.integration.schemas import (
    SyncStatus, SyncResult, IntegrationConfig
)
from app.features.integration.service import IntegrationService

router = APIRouter()

@router.get("/status", response_model=SyncStatus)
async def get_sync_status():
    """Получение статуса синхронизации."""
    integration_service = IntegrationService()
    return await integration_service.get_sync_status()

@router.post("/sync/salesdrive", response_model=SyncResult)
async def sync_with_salesdrive(background_tasks: BackgroundTasks):
    """Синхронизация с SalesDrive API."""
    integration_service = IntegrationService()
    
    # Запускаем синхронизацию в фоне
    background_tasks.add_task(integration_service.sync_salesdrive_data)
    
    return SyncResult(
        status="started",
        message="Синхронизация запущена в фоновом режиме"
    )

@router.post("/sync/manual")
async def manual_sync(item_ids: Optional[list] = None):
    """Ручная синхронизация выбранных товаров."""
    integration_service = IntegrationService()
    return await integration_service.manual_sync(item_ids)

@router.get("/config", response_model=IntegrationConfig)
async def get_integration_config():
    """Получение конфигурации интеграции."""
    integration_service = IntegrationService()
    return await integration_service.get_config()

@router.put("/config")
async def update_integration_config(config: IntegrationConfig):
    """Обновление конфигурации интеграции."""
    integration_service = IntegrationService()
    return await integration_service.update_config(config)

@router.post("/test-connection")
async def test_salesdrive_connection():
    """Тестирование соединения с SalesDrive API."""
    integration_service = IntegrationService()
    return await integration_service.test_connection()

@router.get("/sync-history")
async def get_sync_history(limit: int = 50):
    """Получение истории синхронизации."""
    integration_service = IntegrationService()
    return await integration_service.get_sync_history(limit) 