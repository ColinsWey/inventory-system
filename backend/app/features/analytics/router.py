"""
Роутер для аналитики и отчетов.
"""

from typing import Optional
from datetime import datetime, date
from fastapi import APIRouter, Query

from app.features.analytics.schemas import (
    AnalyticsReport, DashboardData, InventoryAnalytics
)
from app.features.analytics.service import AnalyticsService

router = APIRouter()

@router.get("/dashboard", response_model=DashboardData)
async def get_dashboard_data():
    """Получение данных для главной панели."""
    analytics_service = AnalyticsService()
    return await analytics_service.get_dashboard_data()

@router.get("/inventory-report", response_model=InventoryAnalytics)
async def get_inventory_analytics(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    category: Optional[str] = Query(None)
):
    """Получение аналитики по товарным остаткам."""
    analytics_service = AnalyticsService()
    return await analytics_service.get_inventory_analytics(
        start_date=start_date,
        end_date=end_date,
        category=category
    )

@router.get("/reports/{report_type}", response_model=AnalyticsReport)
async def generate_report(
    report_type: str,
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None)
):
    """Генерация отчета по типу."""
    analytics_service = AnalyticsService()
    return await analytics_service.generate_report(
        report_type=report_type,
        start_date=start_date,
        end_date=end_date
    )

@router.get("/trends")
async def get_inventory_trends(
    days: int = Query(30, ge=7, le=365),
    category: Optional[str] = Query(None)
):
    """Получение трендов товарных остатков."""
    analytics_service = AnalyticsService()
    return await analytics_service.get_trends(days=days, category=category)

@router.get("/alerts")
async def get_inventory_alerts():
    """Получение уведомлений о критических остатках."""
    analytics_service = AnalyticsService()
    return await analytics_service.get_alerts() 