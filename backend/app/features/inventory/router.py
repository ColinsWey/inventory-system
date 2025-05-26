"""
Роутер для управления товарными остатками.
"""

from typing import List, Optional
from fastapi import APIRouter, Query, Depends

from backend.app.features.inventory.schemas import (
    InventoryItem, InventoryItemCreate, InventoryItemUpdate,
    InventoryResponse, InventoryFilter
)
from backend.app.features.inventory.service import InventoryService

router = APIRouter()

@router.get("/", response_model=InventoryResponse)
async def get_inventory_items(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None)
):
    """Получение списка товарных остатков с фильтрацией."""
    inventory_service = InventoryService()
    filters = InventoryFilter(
        search=search,
        category=category,
        status=status
    )
    return await inventory_service.get_items(skip=skip, limit=limit, filters=filters)

@router.get("/{item_id}", response_model=InventoryItem)
async def get_inventory_item(item_id: int):
    """Получение товарного остатка по ID."""
    inventory_service = InventoryService()
    return await inventory_service.get_item_by_id(item_id)

@router.post("/", response_model=InventoryItem)
async def create_inventory_item(item_data: InventoryItemCreate):
    """Создание нового товарного остатка."""
    inventory_service = InventoryService()
    return await inventory_service.create_item(item_data)

@router.put("/{item_id}", response_model=InventoryItem)
async def update_inventory_item(item_id: int, item_data: InventoryItemUpdate):
    """Обновление товарного остатка."""
    inventory_service = InventoryService()
    return await inventory_service.update_item(item_id, item_data)

@router.delete("/{item_id}")
async def delete_inventory_item(item_id: int):
    """Удаление товарного остатка."""
    inventory_service = InventoryService()
    await inventory_service.delete_item(item_id)
    return {"message": "Товарный остаток удален"}

@router.get("/{item_id}/forecast")
async def get_item_forecast(item_id: int, days: int = Query(30, ge=1, le=365)):
    """Получение прогноза для товарного остатка."""
    inventory_service = InventoryService()
    return await inventory_service.get_forecast(item_id, days)

@router.post("/bulk-update")
async def bulk_update_inventory(items: List[InventoryItemUpdate]):
    """Массовое обновление товарных остатков."""
    inventory_service = InventoryService()
    return await inventory_service.bulk_update(items) 