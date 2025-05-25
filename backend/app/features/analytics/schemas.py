"""
Схемы для аналитики и отчетов.
"""

from datetime import datetime, date
from typing import List, Dict, Any, Optional
from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, Field


class AlertLevel(str, Enum):
    """Уровни уведомлений."""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class DashboardData(BaseModel):
    """Данные для главной панели."""
    total_items: int
    total_value: Decimal
    low_stock_items: int
    out_of_stock_items: int
    categories_count: int
    recent_updates: int
    top_categories: List[Dict[str, Any]]
    status_distribution: Dict[str, int]


class InventoryAnalytics(BaseModel):
    """Аналитика товарных остатков."""
    period_start: date
    period_end: date
    total_items: int
    total_value: Decimal
    average_quantity: float
    turnover_rate: float
    category_breakdown: List[Dict[str, Any]]
    supplier_breakdown: List[Dict[str, Any]]
    movement_trends: List[Dict[str, Any]]


class AnalyticsReport(BaseModel):
    """Отчет аналитики."""
    report_type: str
    generated_at: datetime
    period_start: Optional[date]
    period_end: Optional[date]
    data: Dict[str, Any]
    summary: Dict[str, Any]
    charts: List[Dict[str, Any]]


class TrendData(BaseModel):
    """Данные трендов."""
    date: date
    value: float
    category: Optional[str] = None


class InventoryAlert(BaseModel):
    """Уведомление о товарных остатках."""
    id: int
    item_id: int
    item_name: str
    alert_type: str
    level: AlertLevel
    message: str
    created_at: datetime
    is_read: bool = False


class ChartData(BaseModel):
    """Данные для графиков."""
    chart_type: str
    title: str
    labels: List[str]
    datasets: List[Dict[str, Any]]
    options: Optional[Dict[str, Any]] = None 