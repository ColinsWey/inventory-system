"""
Эндпоинты для работы с прогнозами продаж.
"""

import logging
from typing import List, Optional
from uuid import UUID
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.database.connection import get_db
from app.database.models import (
    SalesForecast as ForecastModel, 
    ForecastTemplate as TemplateModel,
    Product as ProductModel,
    User as UserModel
)
from app.api.v1.dependencies import get_current_active_user, require_operator
from app.api.v1.schemas.common import PaginationParams, PaginatedResponse, SuccessResponse

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("", summary="Список прогнозов")
async def get_forecasts(
    # Параметры пагинации
    page: int = Query(1, ge=1, description="Номер страницы"),
    size: int = Query(20, ge=1, le=100, description="Размер страницы"),
    
    # Параметры фильтрации
    product_id: Optional[UUID] = Query(None, description="Фильтр по товару"),
    date_from: Optional[date] = Query(None, description="Дата начала периода"),
    date_to: Optional[date] = Query(None, description="Дата окончания периода"),
    
    # Зависимости
    current_user: UserModel = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Получение списка прогнозов с фильтрацией и пагинацией.
    """
    query = db.query(ForecastModel)
    
    # Применяем фильтры
    if product_id:
        query = query.filter(ForecastModel.product_id == product_id)
    
    if date_from:
        query = query.filter(ForecastModel.forecast_date >= date_from)
    
    if date_to:
        query = query.filter(ForecastModel.forecast_date <= date_to)
    
    # Подсчет общего количества
    total = query.count()
    
    # Пагинация
    forecasts = query.offset((page - 1) * size).limit(size).all()
    
    return PaginatedResponse.create(forecasts, total, page, size)


@router.get("/{forecast_id}", summary="Информация о прогнозе")
async def get_forecast(
    forecast_id: UUID,
    current_user: UserModel = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Получение информации о прогнозе по ID.
    """
    forecast = db.query(ForecastModel).filter(ForecastModel.id == forecast_id).first()
    if not forecast:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Прогноз не найден"
        )
    
    return forecast


@router.post("", summary="Создание прогноза")
async def create_forecast(
    forecast_data: dict,  # Временно используем dict, позже создадим схему
    current_user: UserModel = Depends(require_operator),
    db: Session = Depends(get_db)
):
    """
    Создание нового прогноза.
    """
    # Проверяем существование товара
    product = db.query(ProductModel).filter(
        ProductModel.id == forecast_data.get("product_id")
    ).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Товар не найден"
        )
    
    # Создаем прогноз
    db_forecast = ForecastModel(**forecast_data)
    
    db.add(db_forecast)
    db.commit()
    db.refresh(db_forecast)
    
    logger.info(f"Создан прогноз: {db_forecast.id}")
    return db_forecast


@router.get("/product/{product_id}", summary="Прогнозы для товара")
async def get_product_forecasts(
    product_id: UUID,
    days_ahead: int = Query(30, ge=1, le=365, description="Количество дней вперед"),
    current_user: UserModel = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Получение прогнозов для конкретного товара.
    """
    # Проверяем существование товара
    product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Товар не найден"
        )
    
    # Получаем прогнозы
    end_date = date.today()
    start_date = date.today()
    
    forecasts = db.query(ForecastModel).filter(
        ForecastModel.product_id == product_id,
        ForecastModel.forecast_date >= start_date,
        ForecastModel.forecast_date <= end_date
    ).order_by(ForecastModel.forecast_date).all()
    
    return {
        "product_id": product_id,
        "product_name": product.name,
        "forecasts": forecasts
    }


@router.post("/generate/{product_id}", summary="Генерация прогноза")
async def generate_forecast(
    product_id: UUID,
    days_ahead: int = Query(30, ge=1, le=365, description="Количество дней вперед"),
    current_user: UserModel = Depends(require_operator),
    db: Session = Depends(get_db)
):
    """
    Автоматическая генерация прогноза для товара.
    """
    # Проверяем существование товара
    product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Товар не найден"
        )
    
    # Простой алгоритм прогнозирования (заглушка)
    # В реальном проекте здесь будет сложная логика
    forecasts_created = 0
    
    for i in range(days_ahead):
        forecast_date = date.today()
        
        # Проверяем, нет ли уже прогноза на эту дату
        existing = db.query(ForecastModel).filter(
            ForecastModel.product_id == product_id,
            ForecastModel.forecast_date == forecast_date
        ).first()
        
        if not existing:
            # Простой прогноз - убывающий спрос
            predicted_quantity = max(1, 10 - i // 7)
            confidence = max(0.5, 0.9 - i * 0.01)
            
            forecast = ForecastModel(
                product_id=product_id,
                forecast_date=forecast_date,
                predicted_quantity=predicted_quantity,
                confidence_level=confidence
            )
            
            db.add(forecast)
            forecasts_created += 1
    
    db.commit()
    
    return {
        "message": f"Создано {forecasts_created} прогнозов для товара {product.name}",
        "forecasts_created": forecasts_created
    }


@router.get("/templates/", summary="Шаблоны прогнозирования")
async def get_forecast_templates(
    current_user: UserModel = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Получение списка шаблонов прогнозирования.
    """
    templates = db.query(TemplateModel).filter(TemplateModel.is_active == True).all()
    return templates


@router.post("/templates/", summary="Создание шаблона")
async def create_forecast_template(
    template_data: dict,  # Временно используем dict
    current_user: UserModel = Depends(require_operator),
    db: Session = Depends(get_db)
):
    """
    Создание нового шаблона прогнозирования.
    """
    db_template = TemplateModel(**template_data)
    
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    
    logger.info(f"Создан шаблон прогнозирования: {db_template.name}")
    return db_template 