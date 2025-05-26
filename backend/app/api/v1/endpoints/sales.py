"""
Эндпоинты для работы с продажами.
"""

import logging
from typing import List, Optional
from uuid import UUID
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.database.connection import get_db
from app.database.models import Sale as SaleModel, User as UserModel
from app.api.v1.dependencies import get_current_active_user, require_operator
from app.api.v1.schemas.common import PaginationParams, PaginatedResponse, SuccessResponse

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("", summary="Список продаж")
async def get_sales(
    # Параметры пагинации
    page: int = Query(1, ge=1, description="Номер страницы"),
    size: int = Query(20, ge=1, le=100, description="Размер страницы"),
    
    # Параметры фильтрации
    product_id: Optional[UUID] = Query(None, description="Фильтр по товару"),
    customer_name: Optional[str] = Query(None, description="Фильтр по имени клиента"),
    date_from: Optional[date] = Query(None, description="Дата начала периода"),
    date_to: Optional[date] = Query(None, description="Дата окончания периода"),
    
    # Зависимости
    current_user: UserModel = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Получение списка продаж с фильтрацией и пагинацией.
    """
    query = db.query(SaleModel)
    
    # Применяем фильтры
    if product_id:
        query = query.filter(SaleModel.product_id == product_id)
    
    if customer_name:
        query = query.filter(SaleModel.customer_name.ilike(f"%{customer_name}%"))
    
    if date_from:
        query = query.filter(SaleModel.sale_date >= date_from)
    
    if date_to:
        query = query.filter(SaleModel.sale_date <= date_to)
    
    # Подсчет общего количества
    total = query.count()
    
    # Пагинация
    sales = query.offset((page - 1) * size).limit(size).all()
    
    return PaginatedResponse.create(sales, total, page, size)


@router.get("/{sale_id}", summary="Информация о продаже")
async def get_sale(
    sale_id: UUID,
    current_user: UserModel = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Получение информации о продаже по ID.
    """
    sale = db.query(SaleModel).filter(SaleModel.id == sale_id).first()
    if not sale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Продажа не найдена"
        )
    
    return sale


@router.post("", summary="Создание продажи")
async def create_sale(
    sale_data: dict,  # Временно используем dict, позже создадим схему
    current_user: UserModel = Depends(require_operator),
    db: Session = Depends(get_db)
):
    """
    Создание новой продажи.
    """
    # Создаем продажу
    db_sale = SaleModel(
        **sale_data,
        created_by=current_user.id
    )
    
    db.add(db_sale)
    db.commit()
    db.refresh(db_sale)
    
    logger.info(f"Создана продажа: {db_sale.id}")
    return db_sale


@router.get("/analytics/summary", summary="Аналитика продаж")
async def get_sales_analytics(
    date_from: Optional[date] = Query(None, description="Дата начала периода"),
    date_to: Optional[date] = Query(None, description="Дата окончания периода"),
    current_user: UserModel = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Получение аналитики по продажам.
    """
    query = db.query(SaleModel)
    
    if date_from:
        query = query.filter(SaleModel.sale_date >= date_from)
    
    if date_to:
        query = query.filter(SaleModel.sale_date <= date_to)
    
    sales = query.all()
    
    # Простая аналитика
    total_sales = len(sales)
    total_amount = sum(sale.total_amount for sale in sales)
    
    return {
        "total_sales": total_sales,
        "total_amount": float(total_amount),
        "average_sale": float(total_amount / total_sales) if total_sales > 0 else 0
    } 