"""
Сервис для управления товарными остатками.
"""

from datetime import datetime, timedelta
from typing import List
from decimal import Decimal

from app.features.inventory.schemas import (
    InventoryItem, InventoryItemCreate, InventoryItemUpdate,
    InventoryResponse, InventoryFilter, InventoryStatus,
    InventoryForecast, ForecastData
)
from app.shared.exceptions import NotFoundError, BusinessLogicError


class InventoryService:
    """Сервис для работы с товарными остатками."""
    
    def __init__(self):
        # TODO: Инициализация репозитория базы данных
        pass
    
    async def get_items(
        self, 
        skip: int = 0, 
        limit: int = 100, 
        filters: InventoryFilter = None
    ) -> InventoryResponse:
        """Получение списка товарных остатков с фильтрацией."""
        # TODO: Реализовать получение из базы данных
        # Временная заглушка с тестовыми данными
        mock_items = [
            InventoryItem(
                id=1,
                name="Товар 1",
                sku="SKU001",
                category="Категория А",
                description="Описание товара 1",
                unit_price=Decimal("100.00"),
                quantity=50,
                min_quantity=10,
                max_quantity=100,
                location="Склад А",
                supplier="Поставщик 1",
                status=InventoryStatus.IN_STOCK,
                created_at=datetime.now(),
                updated_at=datetime.now()
            ),
            InventoryItem(
                id=2,
                name="Товар 2",
                sku="SKU002",
                category="Категория Б",
                description="Описание товара 2",
                unit_price=Decimal("200.00"),
                quantity=5,
                min_quantity=10,
                max_quantity=50,
                location="Склад Б",
                supplier="Поставщик 2",
                status=InventoryStatus.LOW_STOCK,
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
        ]
        
        return InventoryResponse(
            items=mock_items[skip:skip+limit],
            total=len(mock_items),
            page=skip // limit + 1,
            per_page=limit,
            pages=(len(mock_items) + limit - 1) // limit
        )
    
    async def get_item_by_id(self, item_id: int) -> InventoryItem:
        """Получение товарного остатка по ID."""
        # TODO: Реализовать получение из базы данных
        if item_id == 1:
            return InventoryItem(
                id=1,
                name="Товар 1",
                sku="SKU001",
                category="Категория А",
                description="Описание товара 1",
                unit_price=Decimal("100.00"),
                quantity=50,
                min_quantity=10,
                max_quantity=100,
                location="Склад А",
                supplier="Поставщик 1",
                status=InventoryStatus.IN_STOCK,
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
        else:
            raise NotFoundError("Товарный остаток", str(item_id))
    
    async def create_item(self, item_data: InventoryItemCreate) -> InventoryItem:
        """Создание нового товарного остатка."""
        # TODO: Реализовать создание в базе данных
        status = self._calculate_status(item_data.quantity, item_data.min_quantity)
        
        return InventoryItem(
            id=999,  # Временный ID
            **item_data.dict(),
            status=status,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
    
    async def update_item(self, item_id: int, item_data: InventoryItemUpdate) -> InventoryItem:
        """Обновление товарного остатка."""
        # TODO: Реализовать обновление в базе данных
        existing_item = await self.get_item_by_id(item_id)
        
        update_data = item_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(existing_item, field, value)
        
        # Пересчитываем статус если изменилось количество
        if 'quantity' in update_data or 'min_quantity' in update_data:
            existing_item.status = self._calculate_status(
                existing_item.quantity, 
                existing_item.min_quantity
            )
        
        existing_item.updated_at = datetime.now()
        return existing_item
    
    async def delete_item(self, item_id: int) -> None:
        """Удаление товарного остатка."""
        # TODO: Реализовать удаление из базы данных
        await self.get_item_by_id(item_id)  # Проверяем существование
    
    async def get_forecast(self, item_id: int, days: int) -> InventoryForecast:
        """Получение прогноза для товарного остатка."""
        # TODO: Реализовать алгоритм прогнозирования
        item = await self.get_item_by_id(item_id)
        
        forecast_data = []
        for i in range(days):
            date = datetime.now() + timedelta(days=i+1)
            # Простой алгоритм прогнозирования (убывание на 1-2 единицы в день)
            predicted_quantity = max(0, item.quantity - (i * 1.5))
            confidence = max(0.5, 1.0 - (i * 0.01))  # Уверенность снижается со временем
            
            forecast_data.append(ForecastData(
                date=date,
                predicted_quantity=int(predicted_quantity),
                confidence=confidence
            ))
        
        recommendations = self._generate_recommendations(item, forecast_data)
        
        return InventoryForecast(
            item_id=item_id,
            forecast_days=days,
            forecast_data=forecast_data,
            recommendations=recommendations
        )
    
    async def bulk_update(self, items: List[InventoryItemUpdate]) -> dict:
        """Массовое обновление товарных остатков."""
        # TODO: Реализовать массовое обновление
        updated_count = len(items)
        return {
            "message": f"Обновлено {updated_count} товарных остатков",
            "updated_count": updated_count
        }
    
    def _calculate_status(self, quantity: int, min_quantity: int) -> InventoryStatus:
        """Расчет статуса товарного остатка."""
        if quantity == 0:
            return InventoryStatus.OUT_OF_STOCK
        elif quantity <= min_quantity:
            return InventoryStatus.LOW_STOCK
        else:
            return InventoryStatus.IN_STOCK
    
    def _generate_recommendations(self, item: InventoryItem, forecast_data: List[ForecastData]) -> List[str]:
        """Генерация рекомендаций на основе прогноза."""
        recommendations = []
        
        # Проверяем когда товар закончится
        out_of_stock_date = None
        for forecast in forecast_data:
            if forecast.predicted_quantity <= 0:
                out_of_stock_date = forecast.date
                break
        
        if out_of_stock_date:
            days_until_out = (out_of_stock_date - datetime.now()).days
            if days_until_out <= 7:
                recommendations.append("Критически низкий остаток! Необходимо срочно пополнить запас.")
            elif days_until_out <= 14:
                recommendations.append("Рекомендуется заказать товар в ближайшее время.")
            else:
                recommendations.append(f"Товар закончится через {days_until_out} дней. Планируйте пополнение.")
        
        if item.quantity <= item.min_quantity:
            recommendations.append("Текущий остаток ниже минимального уровня.")
        
        return recommendations 