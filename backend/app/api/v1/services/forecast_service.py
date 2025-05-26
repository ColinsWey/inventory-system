"""
Сервис для прогнозирования спроса и планирования закупок.
"""

import logging
import numpy as np
import pandas as pd
from typing import List, Dict, Any, Optional, Tuple
from uuid import UUID
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, desc
from fastapi import HTTPException, status

from app.database.models import (
    Product as ProductModel,
    Sale as SaleModel,
    SalesForecast as SalesForecastModel,
    ForecastTemplate as ForecastTemplateModel,
    Inventory as InventoryModel,
    UserLog as UserLogModel
)
from app.api.v1.schemas.forecast import (
    SalesForecastCreate, SalesForecastUpdate, SalesForecast,
    ForecastTemplate, ForecastTemplateCreate, ForecastCalculationResult,
    ProductForecastSummary, ForecastAccuracy, ForecastAnalytics,
    ForecastResult, SeasonalFactors, TrendAnalysis, DemandForecast
)

logger = logging.getLogger(__name__)


class ForecastService:
    """Сервис для прогнозирования спроса."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def _log_forecast_action(self, user_id: UUID, action: str, details: Dict[str, Any]):
        """Логирование действий прогнозирования."""
        log_entry = UserLogModel(
            user_id=user_id,
            action=action,
            details=details,
            ip_address="system",
            user_agent="ForecastService"
        )
        self.db.add(log_entry)
    
    def _get_sales_history(
        self, 
        product_id: UUID, 
        days: int = 365
    ) -> pd.DataFrame:
        """Получение истории продаж для товара."""
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        sales = self.db.query(SaleModel).filter(
            and_(
                SaleModel.product_id == product_id,
                SaleModel.sale_date >= start_date,
                SaleModel.sale_date <= end_date
            )
        ).order_by(SaleModel.sale_date).all()
        
        if not sales:
            return pd.DataFrame(columns=['date', 'quantity', 'amount'])
        
        # Создаем DataFrame
        data = []
        for sale in sales:
            data.append({
                'date': sale.sale_date.date(),
                'quantity': sale.quantity,
                'amount': sale.total_amount
            })
        
        df = pd.DataFrame(data)
        
        # Группируем по дням и суммируем
        df = df.groupby('date').agg({
            'quantity': 'sum',
            'amount': 'sum'
        }).reset_index()
        
        # Заполняем пропущенные дни нулями
        date_range = pd.date_range(start=start_date.date(), end=end_date.date(), freq='D')
        full_df = pd.DataFrame({'date': date_range})
        df = full_df.merge(df, on='date', how='left').fillna(0)
        
        return df
    
    def _calculate_moving_average(self, data: pd.Series, window: int = 7) -> pd.Series:
        """Расчет скользящего среднего."""
        return data.rolling(window=window, min_periods=1).mean()
    
    def _calculate_exponential_smoothing(
        self, 
        data: pd.Series, 
        alpha: float = 0.3
    ) -> pd.Series:
        """Экспоненциальное сглаживание."""
        result = data.copy()
        for i in range(1, len(data)):
            result.iloc[i] = alpha * data.iloc[i] + (1 - alpha) * result.iloc[i-1]
        return result
    
    def _detect_seasonality(self, data: pd.Series) -> Dict[str, Any]:
        """Определение сезонности в данных."""
        if len(data) < 14:
            return {"has_seasonality": False, "period": None, "strength": 0}
        
        # Простое определение недельной сезонности
        weekly_pattern = []
        for day in range(7):
            day_data = data[day::7]
            if len(day_data) > 0:
                weekly_pattern.append(day_data.mean())
            else:
                weekly_pattern.append(0)
        
        # Оценка силы сезонности
        if max(weekly_pattern) > 0:
            seasonality_strength = (max(weekly_pattern) - min(weekly_pattern)) / max(weekly_pattern)
        else:
            seasonality_strength = 0
        
        return {
            "has_seasonality": seasonality_strength > 0.2,
            "period": 7,  # недельная сезонность
            "strength": seasonality_strength,
            "pattern": weekly_pattern
        }
    
    def _calculate_trend(self, data: pd.Series) -> Dict[str, Any]:
        """Расчет тренда."""
        if len(data) < 2:
            return {"direction": "stable", "strength": 0, "slope": 0}
        
        # Линейная регрессия для определения тренда
        x = np.arange(len(data))
        y = data.values
        
        # Убираем NaN значения
        mask = ~np.isnan(y)
        if np.sum(mask) < 2:
            return {"direction": "stable", "strength": 0, "slope": 0}
        
        x_clean = x[mask]
        y_clean = y[mask]
        
        slope, intercept = np.polyfit(x_clean, y_clean, 1)
        
        # Определяем направление тренда
        if abs(slope) < 0.01:
            direction = "stable"
        elif slope > 0:
            direction = "growing"
        else:
            direction = "declining"
        
        # Сила тренда (R²)
        y_pred = slope * x_clean + intercept
        ss_res = np.sum((y_clean - y_pred) ** 2)
        ss_tot = np.sum((y_clean - np.mean(y_clean)) ** 2)
        
        if ss_tot == 0:
            r_squared = 0
        else:
            r_squared = 1 - (ss_res / ss_tot)
        
        return {
            "direction": direction,
            "strength": max(0, r_squared),
            "slope": slope
        }
    
    def _simple_forecast(
        self, 
        data: pd.Series, 
        periods: int,
        method: str = "moving_average"
    ) -> np.ndarray:
        """Простое прогнозирование."""
        if len(data) == 0:
            return np.zeros(periods)
        
        if method == "moving_average":
            # Скользящее среднее за последние 7 дней
            window = min(7, len(data))
            forecast_value = data.tail(window).mean()
            return np.full(periods, max(0, forecast_value))
        
        elif method == "exponential_smoothing":
            # Экспоненциальное сглаживание
            smoothed = self._calculate_exponential_smoothing(data)
            forecast_value = smoothed.iloc[-1]
            return np.full(periods, max(0, forecast_value))
        
        elif method == "linear_trend":
            # Линейный тренд
            if len(data) < 2:
                return np.full(periods, max(0, data.mean()))
            
            x = np.arange(len(data))
            y = data.values
            
            # Убираем NaN
            mask = ~np.isnan(y)
            if np.sum(mask) < 2:
                return np.full(periods, max(0, data.mean()))
            
            slope, intercept = np.polyfit(x[mask], y[mask], 1)
            
            # Прогноз
            future_x = np.arange(len(data), len(data) + periods)
            forecast = slope * future_x + intercept
            
            return np.maximum(0, forecast)  # Не может быть отрицательным
        
        else:
            # По умолчанию - среднее значение
            return np.full(periods, max(0, data.mean()))
    
    def create_forecast(
        self, 
        forecast_data: SalesForecastCreate, 
        user_id: UUID
    ) -> SalesForecastModel:
        """Создание прогноза."""
        # Проверяем существование товара
        product = self.db.query(ProductModel).filter(
            ProductModel.id == forecast_data.product_id
        ).first()
        
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Товар не найден"
            )
        
        # Создаем прогноз
        db_forecast = SalesForecastModel(
            **forecast_data.dict(),
            created_by=user_id
        )
        
        self.db.add(db_forecast)
        self.db.commit()
        self.db.refresh(db_forecast)
        
        # Логируем создание
        self._log_forecast_action(user_id, "forecast_created", {
            "forecast_id": str(db_forecast.id),
            "product_id": str(forecast_data.product_id),
            "period_days": forecast_data.period_days
        })
        
        logger.info(f"Создан прогноз {db_forecast.id} для товара {product.name}")
        return db_forecast
    
    def generate_automatic_forecast(
        self, 
        product_id: UUID, 
        user_id: UUID,
        period_days: int = 30,
        method: str = "auto"
    ) -> ForecastResult:
        """Автоматическое создание прогноза на основе истории продаж."""
        # Проверяем товар
        product = self.db.query(ProductModel).filter(
            ProductModel.id == product_id
        ).first()
        
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Товар не найден"
            )
        
        # Получаем историю продаж
        sales_df = self._get_sales_history(product_id, days=365)
        
        if len(sales_df) == 0:
            # Нет истории продаж
            forecast_result = ForecastResult(
                product_id=product_id,
                forecast_period_days=period_days,
                predicted_demand=0,
                confidence_level=0.0,
                method_used="no_data",
                seasonal_factors=None,
                trend_analysis=TrendAnalysis(
                    direction="stable",
                    strength=0.0,
                    slope=0.0
                ),
                recommendations=["Нет данных о продажах для прогнозирования"],
                forecast_data=[]
            )
        else:
            # Анализируем данные
            quantity_series = sales_df['quantity']
            
            # Определяем сезонность
            seasonality = self._detect_seasonality(quantity_series)
            
            # Определяем тренд
            trend = self._calculate_trend(quantity_series)
            
            # Выбираем метод прогнозирования
            if method == "auto":
                if trend["strength"] > 0.5:
                    chosen_method = "linear_trend"
                elif seasonality["has_seasonality"]:
                    chosen_method = "exponential_smoothing"
                else:
                    chosen_method = "moving_average"
            else:
                chosen_method = method
            
            # Создаем прогноз
            forecast_values = self._simple_forecast(
                quantity_series, 
                period_days, 
                chosen_method
            )
            
            # Рассчитываем общий спрос
            total_demand = np.sum(forecast_values)
            
            # Оценка уверенности (упрощенная)
            if len(quantity_series) > 30:
                recent_std = quantity_series.tail(30).std()
                recent_mean = quantity_series.tail(30).mean()
                if recent_mean > 0:
                    confidence = max(0.1, 1 - (recent_std / recent_mean))
                else:
                    confidence = 0.1
            else:
                confidence = 0.5
            
            # Формируем рекомендации
            recommendations = []
            
            if trend["direction"] == "growing":
                recommendations.append("Спрос растет - рассмотрите увеличение закупок")
            elif trend["direction"] == "declining":
                recommendations.append("Спрос снижается - оптимизируйте остатки")
            
            if seasonality["has_seasonality"]:
                recommendations.append("Обнаружена сезонность - учтите при планировании")
            
            if confidence < 0.3:
                recommendations.append("Низкая точность прогноза - требуется больше данных")
            
            # Создаем детальные данные прогноза
            start_date = datetime.utcnow().date()
            forecast_data = []
            for i, value in enumerate(forecast_values):
                forecast_data.append({
                    "date": (start_date + timedelta(days=i)).isoformat(),
                    "predicted_quantity": float(value),
                    "confidence": float(confidence)
                })
            
            forecast_result = ForecastResult(
                product_id=product_id,
                forecast_period_days=period_days,
                predicted_demand=float(total_demand),
                confidence_level=float(confidence),
                method_used=chosen_method,
                seasonal_factors=SeasonalFactors(
                    has_seasonality=seasonality["has_seasonality"],
                    period_days=seasonality["period"],
                    strength=seasonality["strength"]
                ) if seasonality["has_seasonality"] else None,
                trend_analysis=TrendAnalysis(
                    direction=trend["direction"],
                    strength=trend["strength"],
                    slope=trend["slope"]
                ),
                recommendations=recommendations,
                forecast_data=forecast_data
                        )
        
        # Сохраняем прогноз в базу
        forecast_create = SalesForecastCreate(
            product_id=product_id,
            period_start=datetime.utcnow().date(),
            period_end=(datetime.utcnow() + timedelta(days=period_days)).date(),
            predicted_demand=forecast_result.predicted_demand,
            confidence_level=forecast_result.confidence_level,
            method_used=forecast_result.method_used,
            seasonal_factors=forecast_result.seasonal_factors.dict() if forecast_result.seasonal_factors else None,
            notes=f"Автоматический прогноз. Рекомендации: {'; '.join(forecast_result.recommendations)}"
        )
        
        db_forecast = self.create_forecast(forecast_create, user_id)
        forecast_result.forecast_id = db_forecast.id
        
        logger.info(f"Создан автоматический прогноз для товара {product.name}: "
                   f"спрос {total_demand:.1f}, уверенность {confidence:.2f}")
        
        return forecast_result
    
    def get_forecasts(
        self, 
        product_id: Optional[UUID] = None,
        active_only: bool = True
    ) -> List[SalesForecastModel]:
        """Получение списка прогнозов."""
        query = self.db.query(SalesForecastModel)
        
        if product_id:
            query = query.filter(SalesForecastModel.product_id == product_id)
        
        if active_only:
            current_date = datetime.utcnow().date()
            query = query.filter(SalesForecastModel.period_end >= current_date)
        
        return query.order_by(desc(SalesForecastModel.created_at)).all()
    
    def get_forecast_by_id(self, forecast_id: UUID) -> Optional[SalesForecastModel]:
        """Получение прогноза по ID."""
        return self.db.query(SalesForecastModel).filter(
            SalesForecastModel.id == forecast_id
        ).first()
    
    def update_forecast(
        self, 
        forecast_id: UUID, 
        forecast_data: SalesForecastUpdate,
        user_id: UUID
    ) -> SalesForecastModel:
        """Обновление прогноза."""
        forecast = self.get_forecast_by_id(forecast_id)
        if not forecast:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Прогноз не найден"
            )
        
        # Обновляем поля
        update_data = forecast_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(forecast, field, value)
        
        forecast.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(forecast)
        
        # Логируем обновление
        self._log_forecast_action(user_id, "forecast_updated", {
            "forecast_id": str(forecast_id),
            "updated_fields": list(update_data.keys())
        })
        
        return forecast
    
    def delete_forecast(self, forecast_id: UUID, user_id: UUID) -> bool:
        """Удаление прогноза."""
        forecast = self.get_forecast_by_id(forecast_id)
        if not forecast:
            return False
        
        self.db.delete(forecast)
        self.db.commit()
        
        # Логируем удаление
        self._log_forecast_action(user_id, "forecast_deleted", {
            "forecast_id": str(forecast_id)
        })
        
        return True
    
    def get_demand_forecast_for_products(
        self, 
        product_ids: List[UUID],
        days: int = 30
    ) -> List[DemandForecast]:
        """Получение прогноза спроса для списка товаров."""
        forecasts = []
        
        for product_id in product_ids:
            try:
                # Получаем текущие остатки
                inventory = self.db.query(InventoryModel).filter(
                    InventoryModel.product_id == product_id
                ).first()
                
                current_stock = inventory.quantity if inventory else 0
                
                # Получаем последний прогноз или создаем новый
                existing_forecast = self.db.query(SalesForecastModel).filter(
                    and_(
                        SalesForecastModel.product_id == product_id,
                        SalesForecastModel.period_end >= datetime.utcnow().date()
                    )
                ).order_by(desc(SalesForecastModel.created_at)).first()
                
                if existing_forecast:
                    predicted_demand = existing_forecast.predicted_demand
                    confidence = existing_forecast.confidence_level
                else:
                    # Быстрый прогноз на основе средних продаж
                    sales_df = self._get_sales_history(product_id, days=90)
                    if len(sales_df) > 0:
                        daily_avg = sales_df['quantity'].mean()
                        predicted_demand = daily_avg * days
                        confidence = 0.5
                    else:
                        predicted_demand = 0
                        confidence = 0.1
                
                # Рассчитываем рекомендуемый заказ
                safety_stock = predicted_demand * 0.2  # 20% страховой запас
                recommended_order = max(0, predicted_demand + safety_stock - current_stock)
                
                # Определяем приоритет
                if current_stock <= 0:
                    priority = "critical"
                elif current_stock < predicted_demand * 0.5:
                    priority = "high"
                elif current_stock < predicted_demand:
                    priority = "medium"
                else:
                    priority = "low"
                
                forecasts.append(DemandForecast(
                    product_id=product_id,
                    current_stock=current_stock,
                    predicted_demand=predicted_demand,
                    recommended_order=recommended_order,
                    confidence_level=confidence,
                    priority=priority,
                    forecast_period_days=days
                ))
                
            except Exception as e:
                logger.error(f"Ошибка прогнозирования для товара {product_id}: {e}")
                # Добавляем базовый прогноз при ошибке
                forecasts.append(DemandForecast(
                    product_id=product_id,
                    current_stock=0,
                    predicted_demand=0,
                    recommended_order=0,
                    confidence_level=0.0,
                    priority="unknown",
                    forecast_period_days=days
                ))
        
        return forecasts
    
    def create_forecast_template(
        self, 
        template_data: ForecastTemplateCreate,
        user_id: UUID
    ) -> ForecastTemplateModel:
        """Создание шаблона прогнозирования."""
        db_template = ForecastTemplateModel(
            **template_data.dict(),
            created_by=user_id
        )
        
        self.db.add(db_template)
        self.db.commit()
        self.db.refresh(db_template)
        
        return db_template
    
    def get_forecast_templates(self) -> List[ForecastTemplateModel]:
        """Получение списка шаблонов прогнозирования."""
        return self.db.query(ForecastTemplateModel).filter(
            ForecastTemplateModel.is_active == True
        ).order_by(ForecastTemplateModel.name).all() 