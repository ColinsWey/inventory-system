"""
Схемы для прогнозирования продаж.
"""

from typing import Optional, List, Dict, Any
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel, Field, field_validator

from .common import UUIDMixin, TimestampMixin


class ForecastPeriod(BaseModel):
    """Период прогнозирования."""
    start_date: date = Field(..., description="Дата начала периода")
    end_date: date = Field(..., description="Дата окончания периода")
    
    @field_validator('end_date')
    @classmethod
    def validate_end_date(cls, v, info):
        if info.data.get('start_date') and v <= info.data['start_date']:
            raise ValueError('Дата окончания должна быть больше даты начала')
        return v


class ForecastTemplateBase(BaseModel):
    """Базовая модель шаблона прогнозирования."""
    name: str = Field(..., min_length=1, max_length=100, description="Название шаблона")
    description: Optional[str] = Field(None, description="Описание шаблона")
    category_id: Optional[UUID] = Field(None, description="ID категории")
    seasonal_factors: Dict[str, float] = Field(..., description="Сезонные коэффициенты по месяцам")
    trend_factor: Decimal = Field(default=Decimal("1.0000"), description="Коэффициент тренда")
    is_active: bool = Field(default=True, description="Активен ли шаблон")

    @field_validator('seasonal_factors')
    @classmethod
    def validate_seasonal_factors(cls, v):
        # Проверяем, что есть коэффициенты для всех 12 месяцев
        required_months = {str(i) for i in range(1, 13)}
        if set(v.keys()) != required_months:
            raise ValueError('Должны быть указаны коэффициенты для всех 12 месяцев')
        
        # Проверяем, что все коэффициенты положительные
        for month, factor in v.items():
            if factor <= 0:
                raise ValueError(f'Коэффициент для месяца {month} должен быть положительным')
        
        return v


class ForecastTemplateCreate(ForecastTemplateBase):
    """Создание шаблона прогнозирования."""
    pass


class ForecastTemplateUpdate(BaseModel):
    """Обновление шаблона прогнозирования."""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="Название шаблона")
    description: Optional[str] = Field(None, description="Описание шаблона")
    category_id: Optional[UUID] = Field(None, description="ID категории")
    seasonal_factors: Optional[Dict[str, float]] = Field(None, description="Сезонные коэффициенты по месяцам")
    trend_factor: Optional[Decimal] = Field(None, description="Коэффициент тренда")
    is_active: Optional[bool] = Field(None, description="Активен ли шаблон")


class ForecastTemplate(UUIDMixin, TimestampMixin, ForecastTemplateBase):
    """Полная модель шаблона прогнозирования."""
    pass


class SalesForecastBase(BaseModel):
    """Базовая модель прогноза продаж."""
    product_id: UUID = Field(..., description="ID товара")
    forecast_date: date = Field(..., description="Дата прогноза")
    predicted_quantity: int = Field(..., ge=0, description="Прогнозируемое количество")
    confidence_level: Decimal = Field(default=Decimal("0.80"), ge=0, le=1, description="Уровень доверия")
    template_id: Optional[UUID] = Field(None, description="ID шаблона прогнозирования")
    actual_quantity: Optional[int] = Field(None, ge=0, description="Фактическое количество")


class SalesForecastCreate(SalesForecastBase):
    """Создание прогноза продаж."""
    pass


class SalesForecastUpdate(BaseModel):
    """Обновление прогноза продаж."""
    predicted_quantity: Optional[int] = Field(None, ge=0, description="Прогнозируемое количество")
    confidence_level: Optional[Decimal] = Field(None, ge=0, le=1, description="Уровень доверия")
    actual_quantity: Optional[int] = Field(None, ge=0, description="Фактическое количество")


class SalesForecast(UUIDMixin, TimestampMixin, SalesForecastBase):
    """Полная модель прогноза продаж."""
    product_name: Optional[str] = Field(None, description="Название товара")
    product_sku: Optional[str] = Field(None, description="Артикул товара")
    accuracy: Optional[Decimal] = Field(None, description="Точность прогноза (если есть факт)")


class ForecastCalculationRequest(BaseModel):
    """Запрос на расчет прогнозов."""
    product_ids: Optional[List[UUID]] = Field(None, description="ID товаров (если не указано - все)")
    category_ids: Optional[List[UUID]] = Field(None, description="ID категорий")
    period: ForecastPeriod = Field(..., description="Период прогнозирования")
    template_id: Optional[UUID] = Field(None, description="ID шаблона (если не указано - автовыбор)")
    recalculate_existing: bool = Field(default=False, description="Пересчитывать существующие прогнозы")


class ForecastCalculationResult(BaseModel):
    """Результат расчета прогнозов."""
    total_products: int = Field(description="Общее количество товаров")
    calculated_forecasts: int = Field(description="Рассчитано прогнозов")
    updated_forecasts: int = Field(description="Обновлено прогнозов")
    errors: List[str] = Field(default=[], description="Ошибки при расчете")
    warnings: List[str] = Field(default=[], description="Предупреждения")


class ProductForecastSummary(BaseModel):
    """Сводка прогнозов по товару."""
    product_id: UUID = Field(description="ID товара")
    product_name: str = Field(description="Название товара")
    product_sku: str = Field(description="Артикул товара")
    current_stock: int = Field(description="Текущий остаток")
    forecasts: List[SalesForecast] = Field(description="Прогнозы по дням")
    total_predicted: int = Field(description="Общее прогнозируемое количество")
    average_confidence: Decimal = Field(description="Средний уровень доверия")
    recommended_order: Optional[int] = Field(None, description="Рекомендуемое количество к заказу")


class ForecastAccuracy(BaseModel):
    """Точность прогнозирования."""
    product_id: UUID = Field(description="ID товара")
    product_name: str = Field(description="Название товара")
    period_start: date = Field(description="Начало периода")
    period_end: date = Field(description="Конец периода")
    total_predicted: int = Field(description="Общее прогнозируемое количество")
    total_actual: int = Field(description="Общее фактическое количество")
    accuracy_percentage: Decimal = Field(description="Точность в процентах")
    mean_absolute_error: Decimal = Field(description="Средняя абсолютная ошибка")


class ForecastAnalytics(BaseModel):
    """Аналитика прогнозирования."""
    period: ForecastPeriod = Field(description="Период анализа")
    total_products: int = Field(description="Общее количество товаров")
    products_with_forecasts: int = Field(description="Товаров с прогнозами")
    average_accuracy: Decimal = Field(description="Средняя точность прогнозов")
    best_performing_products: List[ForecastAccuracy] = Field(description="Лучшие прогнозы")
    worst_performing_products: List[ForecastAccuracy] = Field(description="Худшие прогнозы")
    category_performance: Dict[str, Decimal] = Field(description="Точность по категориям")


class ForecastFilters(BaseModel):
    """Фильтры для прогнозов."""
    product_id: Optional[UUID] = Field(None, description="ID товара")
    category_id: Optional[UUID] = Field(None, description="ID категории")
    template_id: Optional[UUID] = Field(None, description="ID шаблона")
    date_from: Optional[date] = Field(None, description="Дата начала")
    date_to: Optional[date] = Field(None, description="Дата окончания")
    min_confidence: Optional[Decimal] = Field(None, ge=0, le=1, description="Минимальный уровень доверия")
    has_actual: Optional[bool] = Field(None, description="Только с фактическими данными")


class SeasonalFactors(BaseModel):
    """Сезонные факторы."""
    has_seasonality: bool = Field(description="Есть ли сезонность")
    period_days: int = Field(description="Период сезонности в днях")
    strength: float = Field(description="Сила сезонности")


class TrendAnalysis(BaseModel):
    """Анализ тренда."""
    direction: str = Field(description="Направление тренда")
    strength: float = Field(description="Сила тренда")
    slope: float = Field(description="Наклон тренда")


class DemandForecast(BaseModel):
    """Прогноз спроса."""
    product_id: UUID = Field(description="ID товара")
    current_stock: int = Field(description="Текущий остаток")
    predicted_demand: float = Field(description="Прогнозируемый спрос")
    recommended_order: float = Field(description="Рекомендуемый заказ")
    confidence_level: float = Field(description="Уровень доверия")
    priority: str = Field(description="Приоритет")
    forecast_period_days: int = Field(description="Период прогноза в днях")


class ForecastResult(BaseModel):
    """Результат прогнозирования."""
    product_id: UUID = Field(description="ID товара")
    forecast_period_days: int = Field(description="Период прогноза в днях")
    predicted_demand: float = Field(description="Прогнозируемый спрос")
    confidence_level: float = Field(description="Уровень доверия")
    method_used: str = Field(description="Использованный метод")
    seasonal_factors: Optional[SeasonalFactors] = Field(None, description="Сезонные факторы")
    trend_analysis: TrendAnalysis = Field(description="Анализ тренда")
    recommendations: List[str] = Field(description="Рекомендации")
    forecast_data: List[Dict[str, Any]] = Field(description="Детальные данные прогноза")
    forecast_id: Optional[UUID] = Field(None, description="ID созданного прогноза") 