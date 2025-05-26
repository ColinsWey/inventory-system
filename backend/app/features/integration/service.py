"""
Сервис интеграции с внешними системами.
"""

import time
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any

import httpx
from loguru import logger

from backend.app.core.config import settings
from backend.app.features.integration.schemas import (
    SyncStatus, SyncResult, IntegrationConfig, SalesDriveItem,
    SyncHistoryEntry, ConnectionTestResult, SyncStatusEnum
)
from backend.app.shared.exceptions import ExternalServiceError


class IntegrationService:
    """Сервис для интеграции с внешними системами."""
    
    def __init__(self):
        self.salesdrive_url = settings.SALESDRIVE_API_URL
        self.salesdrive_key = settings.SALESDRIVE_API_KEY
        self.timeout = settings.SALESDRIVE_TIMEOUT
    
    async def get_sync_status(self) -> SyncStatus:
        """Получение статуса синхронизации."""
        # TODO: Получить реальный статус из базы данных
        return SyncStatus(
            status=SyncStatusEnum.IDLE,
            last_sync=datetime.now() - timedelta(hours=1),
            next_sync=datetime.now() + timedelta(hours=1),
            items_synced=150,
            items_failed=0
        )
    
    async def sync_salesdrive_data(self) -> SyncResult:
        """Синхронизация данных с SalesDrive API."""
        start_time = datetime.now()
        result = SyncResult(
            status="running",
            message="Синхронизация начата",
            started_at=start_time
        )
        
        try:
            # Получаем данные из SalesDrive API
            items = await self._fetch_salesdrive_items()
            
            # Обрабатываем каждый товар
            for item in items:
                try:
                    await self._process_salesdrive_item(item)
                    result.items_processed += 1
                    result.items_updated += 1
                except Exception as e:
                    logger.error(f"Ошибка обработки товара {item.id}: {str(e)}")
                    result.items_failed += 1
                    result.errors.append(f"Товар {item.id}: {str(e)}")
            
            result.status = "success" if result.items_failed == 0 else "partial"
            result.message = f"Синхронизация завершена. Обработано: {result.items_processed}"
            
        except Exception as e:
            logger.exception("Ошибка синхронизации с SalesDrive")
            result.status = "error"
            result.message = f"Ошибка синхронизации: {str(e)}"
            result.errors.append(str(e))
        
        result.completed_at = datetime.now()
        return result
    
    async def manual_sync(self, item_ids: Optional[List[str]] = None) -> SyncResult:
        """Ручная синхронизация выбранных товаров."""
        # TODO: Реализовать ручную синхронизацию
        return SyncResult(
            status="success",
            message="Ручная синхронизация завершена",
            items_processed=len(item_ids) if item_ids else 0,
            items_updated=len(item_ids) if item_ids else 0
        )
    
    async def get_config(self) -> IntegrationConfig:
        """Получение конфигурации интеграции."""
        # TODO: Получить конфигурацию из базы данных
        return IntegrationConfig(
            salesdrive_enabled=True,
            salesdrive_api_url=self.salesdrive_url,
            salesdrive_api_key="***",  # Скрываем ключ
            sync_interval_minutes=60,
            auto_sync_enabled=True,
            sync_categories=["Категория А", "Категория Б"],
            field_mapping={
                "name": "product_name",
                "sku": "product_code",
                "price": "unit_price"
            }
        )
    
    async def update_config(self, config: IntegrationConfig) -> dict:
        """Обновление конфигурации интеграции."""
        # TODO: Сохранить конфигурацию в базе данных
        return {"message": "Конфигурация обновлена"}
    
    async def test_connection(self) -> ConnectionTestResult:
        """Тестирование соединения с SalesDrive API."""
        start_time = time.time()
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.salesdrive_url}/api/v1/health",
                    headers={"Authorization": f"Bearer {self.salesdrive_key}"}
                )
                
                response_time = int((time.time() - start_time) * 1000)
                
                if response.status_code == 200:
                    return ConnectionTestResult(
                        success=True,
                        message="Соединение успешно установлено",
                        response_time_ms=response_time,
                        api_version="1.0",
                        tested_at=datetime.now()
                    )
                else:
                    return ConnectionTestResult(
                        success=False,
                        message=f"Ошибка соединения: HTTP {response.status_code}",
                        response_time_ms=response_time,
                        tested_at=datetime.now()
                    )
                    
        except Exception as e:
            return ConnectionTestResult(
                success=False,
                message=f"Ошибка соединения: {str(e)}",
                tested_at=datetime.now()
            )
    
    async def get_sync_history(self, limit: int = 50) -> List[SyncHistoryEntry]:
        """Получение истории синхронизации."""
        # TODO: Получить историю из базы данных
        return [
            SyncHistoryEntry(
                id=1,
                sync_type="auto",
                status=SyncStatusEnum.SUCCESS,
                started_at=datetime.now() - timedelta(hours=1),
                completed_at=datetime.now() - timedelta(hours=1, minutes=5),
                items_processed=150,
                items_updated=10,
                items_created=5,
                items_failed=0
            ),
            SyncHistoryEntry(
                id=2,
                sync_type="manual",
                status=SyncStatusEnum.PARTIAL,
                started_at=datetime.now() - timedelta(hours=3),
                completed_at=datetime.now() - timedelta(hours=3, minutes=2),
                items_processed=50,
                items_updated=45,
                items_created=0,
                items_failed=5,
                error_message="Ошибка обработки 5 товаров"
            )
        ]
    
    async def _fetch_salesdrive_items(self) -> List[SalesDriveItem]:
        """Получение товаров из SalesDrive API."""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.salesdrive_url}/api/v1/products",
                    headers={"Authorization": f"Bearer {self.salesdrive_key}"}
                )
                
                if response.status_code != 200:
                    raise ExternalServiceError("SalesDrive", f"HTTP {response.status_code}")
                
                data = response.json()
                
                # Преобразуем данные в наши схемы
                items = []
                for item_data in data.get("products", []):
                    items.append(SalesDriveItem(
                        id=item_data["id"],
                        name=item_data["name"],
                        sku=item_data["sku"],
                        category=item_data.get("category", "Без категории"),
                        price=float(item_data["price"]),
                        quantity=int(item_data["quantity"]),
                        description=item_data.get("description"),
                        supplier=item_data.get("supplier"),
                        updated_at=datetime.fromisoformat(item_data["updated_at"])
                    ))
                
                return items
                
        except httpx.RequestError as e:
            raise ExternalServiceError("SalesDrive", f"Ошибка запроса: {str(e)}")
        except Exception as e:
            raise ExternalServiceError("SalesDrive", f"Неожиданная ошибка: {str(e)}")
    
    async def _process_salesdrive_item(self, item: SalesDriveItem) -> None:
        """Обработка товара из SalesDrive."""
        # TODO: Реализовать сохранение/обновление товара в базе данных
        logger.info(f"Обрабатываем товар {item.sku}: {item.name}")
        
        # Здесь будет логика:
        # 1. Поиск существующего товара по SKU
        # 2. Создание нового или обновление существующего
        # 3. Логирование изменений
        pass 