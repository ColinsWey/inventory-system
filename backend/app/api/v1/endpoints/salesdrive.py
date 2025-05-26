"""
Эндпоинты для интеграции с SalesDrive API.
"""

import logging
from typing import List, Optional
from datetime import datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session

from backend.app.core.database.connection import get_db
from backend.app.api.v1.dependencies import get_current_user, require_manager
from backend.app.api.v1.schemas.auth import UserInfo
from backend.app.api.v1.schemas.common import SuccessResponse, ErrorResponse
from backend.app.api.v1.schemas.salesdrive import (
    SalesDriveSyncRequest, SalesDriveSyncResult, SalesDriveConnectionTest,
    SalesDriveApiConfig, SalesDriveProductsResponse, SalesDriveOrdersResponse
)
from backend.app.api.v1.schemas.import_data import ImportResult, ImportStatus
from backend.app.api.v1.services.salesdrive_service import SalesDriveService, SalesDriveAPIError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/salesdrive", tags=["SalesDrive Integration"])


@router.post(
    "/test-connection",
    response_model=SalesDriveConnectionTest,
    summary="Тестирование соединения с SalesDrive API",
    description="Проверяет доступность и корректность настроек SalesDrive API"
)
async def test_connection(
    config: Optional[SalesDriveApiConfig] = None,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_manager)
):
    """Тестирование соединения с SalesDrive API."""
    try:
        start_time = datetime.utcnow()
        
        service = SalesDriveService(db, config)
        success = await service.test_connection()
        
        end_time = datetime.utcnow()
        response_time = (end_time - start_time).total_seconds()
        
        if success:
            return SalesDriveConnectionTest(
                success=True,
                message="Соединение с SalesDrive API успешно установлено",
                response_time=response_time
            )
        else:
            return SalesDriveConnectionTest(
                success=False,
                message="Не удалось подключиться к SalesDrive API",
                response_time=response_time
            )
    
    except SalesDriveAPIError as e:
        logger.error(f"SalesDrive API error during connection test: {e}")
        return SalesDriveConnectionTest(
            success=False,
            message=f"Ошибка API: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error during connection test: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Внутренняя ошибка сервера: {str(e)}"
        )


@router.get(
    "/products",
    response_model=List[dict],
    summary="Получение товаров из SalesDrive",
    description="Получает список товаров из SalesDrive API с пагинацией"
)
async def get_products(
    page: int = 1,
    limit: int = 100,
    updated_since: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_manager)
):
    """Получение товаров из SalesDrive."""
    try:
        service = SalesDriveService(db)
        products = await service.get_products(
            page=page,
            limit=limit,
            updated_since=updated_since
        )
        
        return [product.dict() for product in products]
    
    except SalesDriveAPIError as e:
        logger.error(f"SalesDrive API error: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Ошибка SalesDrive API: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error getting products: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка получения товаров: {str(e)}"
        )


@router.get(
    "/orders",
    response_model=List[dict],
    summary="Получение заказов из SalesDrive",
    description="Получает список заказов из SalesDrive API за указанный период"
)
async def get_orders(
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    page: int = 1,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_manager)
):
    """Получение заказов из SalesDrive."""
    try:
        # Устанавливаем период по умолчанию (последние 7 дней)
        if not date_from:
            date_from = datetime.utcnow() - timedelta(days=7)
        if not date_to:
            date_to = datetime.utcnow()
        
        service = SalesDriveService(db)
        orders = await service.get_orders(
            date_from=date_from,
            date_to=date_to,
            page=page,
            limit=limit
        )
        
        return orders
    
    except SalesDriveAPIError as e:
        logger.error(f"SalesDrive API error: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Ошибка SalesDrive API: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error getting orders: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка получения заказов: {str(e)}"
        )


@router.post(
    "/sync",
    response_model=SuccessResponse,
    summary="Запуск синхронизации с SalesDrive",
    description="Запускает процесс синхронизации данных с SalesDrive API в фоновом режиме"
)
async def start_sync(
    sync_request: SalesDriveSyncRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_manager)
):
    """Запуск синхронизации с SalesDrive."""
    try:
        # Добавляем задачу синхронизации в фоновые задачи
        background_tasks.add_task(
            _run_sync_task,
            sync_request,
            current_user.id,
            db
        )
        
        return SuccessResponse(
            message="Синхронизация с SalesDrive запущена в фоновом режиме"
        )
    
    except Exception as e:
        logger.error(f"Error starting sync: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка запуска синхронизации: {str(e)}"
        )


@router.post(
    "/sync/products",
    response_model=ImportResult,
    summary="Синхронизация товаров",
    description="Синхронизирует товары из SalesDrive с локальной базой данных"
)
async def sync_products(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_manager)
):
    """Синхронизация товаров из SalesDrive."""
    try:
        service = SalesDriveService(db)
        result = await service.sync_products(current_user.id)
        
        logger.info(f"Products sync completed by user {current_user.id}: "
                   f"{result.processed_items} processed, {result.created_items} created, "
                   f"{result.updated_items} updated, {result.failed_items} failed")
        
        return result
    
    except SalesDriveAPIError as e:
        logger.error(f"SalesDrive API error during products sync: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Ошибка SalesDrive API: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error syncing products: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка синхронизации товаров: {str(e)}"
        )


@router.post(
    "/sync/orders",
    response_model=ImportResult,
    summary="Синхронизация заказов",
    description="Синхронизирует заказы из SalesDrive за указанный период"
)
async def sync_orders(
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_manager)
):
    """Синхронизация заказов из SalesDrive."""
    try:
        service = SalesDriveService(db)
        result = await service.sync_orders(
            user_id=current_user.id,
            date_from=date_from,
            date_to=date_to
        )
        
        logger.info(f"Orders sync completed by user {current_user.id}: "
                   f"{result.processed_items} processed")
        
        return result
    
    except SalesDriveAPIError as e:
        logger.error(f"SalesDrive API error during orders sync: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Ошибка SalesDrive API: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error syncing orders: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка синхронизации заказов: {str(e)}"
        )


@router.get(
    "/sync/status",
    response_model=List[dict],
    summary="Статус синхронизации",
    description="Получает информацию о последних синхронизациях с SalesDrive"
)
async def get_sync_status(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_manager)
):
    """Получение статуса синхронизации."""
    try:
        # Здесь можно добавить запрос к таблице логов синхронизации
        # Пока возвращаем заглушку
        return [
            {
                "id": "sync-1",
                "type": "products",
                "status": "completed",
                "started_at": datetime.utcnow() - timedelta(hours=1),
                "completed_at": datetime.utcnow() - timedelta(minutes=55),
                "processed_items": 150,
                "created_items": 10,
                "updated_items": 140,
                "failed_items": 0
            }
        ]
    
    except Exception as e:
        logger.error(f"Error getting sync status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка получения статуса синхронизации: {str(e)}"
        )


@router.post(
    "/webhook",
    response_model=SuccessResponse,
    summary="Webhook от SalesDrive",
    description="Обработка webhook событий от SalesDrive API"
)
async def handle_webhook(
    event_data: dict,
    db: Session = Depends(get_db)
):
    """Обработка webhook от SalesDrive."""
    try:
        event_type = event_data.get('event_type')
        
        logger.info(f"Received SalesDrive webhook: {event_type}")
        
        # Обработка различных типов событий
        if event_type == 'product.updated':
            # Обновление товара
            product_id = event_data.get('data', {}).get('id')
            logger.info(f"Product updated: {product_id}")
            
        elif event_type == 'order.created':
            # Новый заказ
            order_id = event_data.get('data', {}).get('id')
            logger.info(f"New order created: {order_id}")
            
        elif event_type == 'order.status_changed':
            # Изменение статуса заказа
            order_id = event_data.get('data', {}).get('id')
            new_status = event_data.get('data', {}).get('status')
            logger.info(f"Order {order_id} status changed to: {new_status}")
        
        return SuccessResponse(message="Webhook обработан успешно")
    
    except Exception as e:
        logger.error(f"Error processing webhook: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка обработки webhook: {str(e)}"
        )


async def _run_sync_task(
    sync_request: SalesDriveSyncRequest,
    user_id: UUID,
    db: Session
):
    """Фоновая задача синхронизации."""
    try:
        service = SalesDriveService(db)
        
        # Синхронизация товаров
        if sync_request.sync_products:
            logger.info("Starting products sync...")
            await service.sync_products(user_id)
            logger.info("Products sync completed")
        
        # Синхронизация заказов
        if sync_request.sync_orders:
            logger.info("Starting orders sync...")
            await service.sync_orders(
                user_id=user_id,
                date_from=sync_request.date_from,
                date_to=sync_request.date_to
            )
            logger.info("Orders sync completed")
        
        logger.info("Full sync completed successfully")
    
    except Exception as e:
        logger.error(f"Error in sync task: {e}")
        # Здесь можно добавить уведомление пользователя об ошибке 