"""
Unit тесты для модуля прогнозирования спроса
"""

import pytest
import pandas as pd
from datetime import datetime, timedelta
from unittest.mock import Mock, patch
import numpy as np

from backend.services.forecast_service import ForecastService
from backend.models.product import Product
from backend.models.sales_history import SalesHistory


class TestForecastService:
    """Тесты для сервиса прогнозирования"""

    @pytest.fixture
    def forecast_service(self):
        """Фикстура для создания экземпляра сервиса прогнозирования"""
        return ForecastService()

    @pytest.fixture
    def sample_product(self):
        """Фикстура с тестовым товаром"""
        return Product(
            id=1,
            name="iPhone 15 Pro",
            sku="IPHONE15PRO",
            category_id=1,
            price=89990,
            current_stock=25,
            min_stock=5,
            max_stock=100,
            lead_time_days=7
        )

    @pytest.fixture
    def sample_sales_data(self):
        """Фикстура с тестовыми данными продаж"""
        dates = pd.date_range(
            start=datetime.now() - timedelta(days=365),
            end=datetime.now(),
            freq='D'
        )
        
        # Генерируем синтетические данные продаж с трендом и сезонностью
        base_sales = 10
        trend = np.linspace(0, 5, len(dates))
        seasonality = 3 * np.sin(2 * np.pi * np.arange(len(dates)) / 365.25)
        noise = np.random.normal(0, 1, len(dates))
        
        sales_data = base_sales + trend + seasonality + noise
        sales_data = np.maximum(sales_data, 0)  # Убираем отрицательные значения
        
        return pd.DataFrame({
            'date': dates,
            'quantity': sales_data,
            'product_id': 1,
            'is_wholesale': False
        })

    def test_basic_forecast_calculation(self, forecast_service, sample_product, sample_sales_data):
        """Тест базового расчета прогноза"""
        # Given: товар и исторические данные продаж
        forecast_days = 30
        
        # When: рассчитываем прогноз
        forecast = forecast_service.calculate_forecast(
            product=sample_product,
            sales_data=sample_sales_data,
            forecast_days=forecast_days
        )
        
        # Then: прогноз должен содержать правильное количество дней
        assert len(forecast) == forecast_days
        assert all(day['quantity'] >= 0 for day in forecast)
        assert all('date' in day for day in forecast)
        assert all('confidence_interval' in day for day in forecast)

    def test_forecast_excludes_wholesale_orders(self, forecast_service, sample_product):
        """Тест исключения оптовых заказов из прогноза"""
        # Given: данные с оптовыми заказами
        sales_data = pd.DataFrame({
            'date': pd.date_range(start='2023-01-01', periods=100, freq='D'),
            'quantity': [5] * 50 + [100] * 10 + [5] * 40,  # Большие оптовые заказы в середине
            'product_id': 1,
            'is_wholesale': [False] * 50 + [True] * 10 + [False] * 40
        })
        
        # When: рассчитываем прогноз
        forecast = forecast_service.calculate_forecast(
            product=sample_product,
            sales_data=sales_data,
            forecast_days=30
        )
        
        # Then: средний прогноз должен быть близок к 5, а не к 15
        avg_forecast = np.mean([day['quantity'] for day in forecast])
        assert 4 <= avg_forecast <= 7  # Должен быть близок к обычным продажам

    def test_seasonality_application(self, forecast_service, sample_product, sample_sales_data):
        """Тест применения сезонности к прогнозу"""
        # Given: сезонный коэффициент для текущего месяца
        seasonality_coefficients = {
            'january': 1.5,
            'february': 0.8,
            'march': 1.0,
            'april': 1.2,
            'may': 1.0,
            'june': 0.9,
            'july': 0.8,
            'august': 0.9,
            'september': 1.1,
            'october': 1.2,
            'november': 1.4,
            'december': 1.8
        }
        
        # When: рассчитываем прогноз с сезонностью
        forecast_with_seasonality = forecast_service.apply_seasonality(
            base_forecast=sample_sales_data['quantity'].mean(),
            seasonality_coefficients=seasonality_coefficients,
            forecast_start_date=datetime.now()
        )
        
        # Then: прогноз должен быть скорректирован на сезонный коэффициент
        current_month = datetime.now().strftime('%B').lower()
        expected_multiplier = seasonality_coefficients.get(current_month, 1.0)
        
        assert len(forecast_with_seasonality) == 30  # По умолчанию 30 дней
        # Проверяем, что сезонность применена
        assert forecast_with_seasonality[0] != sample_sales_data['quantity'].mean()

    def test_price_change_adjustment(self, forecast_service, sample_product, sample_sales_data):
        """Тест корректировки прогноза на изменение цены"""
        # Given: изменение цены на 20%
        old_price = 89990
        new_price = 107988  # +20%
        price_elasticity = -0.5  # Эластичность спроса по цене
        
        # When: корректируем прогноз на изменение цены
        base_forecast = sample_sales_data['quantity'].mean()
        adjusted_forecast = forecast_service.adjust_for_price_change(
            base_forecast=base_forecast,
            old_price=old_price,
            new_price=new_price,
            price_elasticity=price_elasticity
        )
        
        # Then: прогноз должен уменьшиться из-за роста цены
        price_change_percent = (new_price - old_price) / old_price
        expected_demand_change = price_elasticity * price_change_percent
        expected_forecast = base_forecast * (1 + expected_demand_change)
        
        assert abs(adjusted_forecast - expected_forecast) < 0.01

    def test_confidence_intervals(self, forecast_service, sample_product, sample_sales_data):
        """Тест расчета доверительных интервалов"""
        # Given: исторические данные с известной волатильностью
        
        # When: рассчитываем прогноз с доверительными интервалами
        forecast = forecast_service.calculate_forecast(
            product=sample_product,
            sales_data=sample_sales_data,
            forecast_days=30,
            confidence_level=0.95
        )
        
        # Then: каждый день должен иметь доверительный интервал
        for day in forecast:
            assert 'confidence_interval' in day
            assert 'lower' in day['confidence_interval']
            assert 'upper' in day['confidence_interval']
            assert day['confidence_interval']['lower'] <= day['quantity']
            assert day['quantity'] <= day['confidence_interval']['upper']

    def test_trend_detection(self, forecast_service):
        """Тест обнаружения тренда в данных"""
        # Given: данные с явным восходящим трендом
        dates = pd.date_range(start='2023-01-01', periods=100, freq='D')
        trend_data = pd.DataFrame({
            'date': dates,
            'quantity': range(1, 101),  # Линейный рост
            'product_id': 1
        })
        
        # When: анализируем тренд
        trend = forecast_service.detect_trend(trend_data)
        
        # Then: должен быть обнаружен положительный тренд
        assert trend['direction'] == 'increasing'
        assert trend['slope'] > 0
        assert trend['significance'] > 0.05  # Статистически значимый

    def test_outlier_detection(self, forecast_service, sample_sales_data):
        """Тест обнаружения выбросов в данных"""
        # Given: данные с выбросами
        outlier_data = sample_sales_data.copy()
        outlier_data.loc[50, 'quantity'] = 1000  # Большой выброс
        
        # When: обнаруживаем выбросы
        outliers = forecast_service.detect_outliers(outlier_data)
        
        # Then: выброс должен быть обнаружен
        assert len(outliers) > 0
        assert 50 in outliers['index'].values

    def test_forecast_accuracy_metrics(self, forecast_service, sample_sales_data):
        """Тест расчета метрик точности прогноза"""
        # Given: исторические данные и прогноз
        actual_data = sample_sales_data['quantity'].tail(30).values
        predicted_data = actual_data * 1.1  # Прогноз с 10% завышением
        
        # When: рассчитываем метрики точности
        metrics = forecast_service.calculate_accuracy_metrics(
            actual=actual_data,
            predicted=predicted_data
        )
        
        # Then: метрики должны быть рассчитаны
        assert 'mae' in metrics  # Mean Absolute Error
        assert 'mape' in metrics  # Mean Absolute Percentage Error
        assert 'rmse' in metrics  # Root Mean Square Error
        assert all(metric >= 0 for metric in metrics.values())

    def test_stock_recommendation(self, forecast_service, sample_product):
        """Тест рекомендаций по заказу товара"""
        # Given: прогноз спроса на 30 дней
        forecast_data = [{'quantity': 10, 'date': datetime.now() + timedelta(days=i)} 
                        for i in range(30)]
        
        # When: рассчитываем рекомендацию по заказу
        recommendation = forecast_service.calculate_stock_recommendation(
            product=sample_product,
            forecast=forecast_data,
            service_level=0.95
        )
        
        # Then: рекомендация должна содержать необходимую информацию
        assert 'recommended_order_quantity' in recommendation
        assert 'reorder_point' in recommendation
        assert 'safety_stock' in recommendation
        assert recommendation['recommended_order_quantity'] >= 0

    def test_forecast_with_promotions(self, forecast_service, sample_product, sample_sales_data):
        """Тест прогнозирования с учетом промо-акций"""
        # Given: запланированная промо-акция
        promotion = {
            'start_date': datetime.now() + timedelta(days=10),
            'end_date': datetime.now() + timedelta(days=15),
            'discount_percent': 20,
            'expected_uplift': 1.5  # Ожидаемый рост продаж в 1.5 раза
        }
        
        # When: рассчитываем прогноз с учетом промо-акции
        forecast = forecast_service.calculate_forecast_with_promotions(
            product=sample_product,
            sales_data=sample_sales_data,
            promotions=[promotion],
            forecast_days=30
        )
        
        # Then: в дни промо-акции прогноз должен быть выше
        promo_days = [day for day in forecast 
                     if promotion['start_date'] <= day['date'] <= promotion['end_date']]
        regular_days = [day for day in forecast 
                       if day['date'] < promotion['start_date'] or day['date'] > promotion['end_date']]
        
        if promo_days and regular_days:
            avg_promo_sales = np.mean([day['quantity'] for day in promo_days])
            avg_regular_sales = np.mean([day['quantity'] for day in regular_days])
            assert avg_promo_sales > avg_regular_sales

    def test_forecast_with_insufficient_data(self, forecast_service, sample_product):
        """Тест прогнозирования с недостаточными данными"""
        # Given: очень мало исторических данных
        insufficient_data = pd.DataFrame({
            'date': pd.date_range(start='2024-01-01', periods=5, freq='D'),
            'quantity': [1, 2, 3, 2, 1],
            'product_id': 1
        })
        
        # When: пытаемся рассчитать прогноз
        with pytest.raises(ValueError, match="Недостаточно данных для прогнозирования"):
            forecast_service.calculate_forecast(
                product=sample_product,
                sales_data=insufficient_data,
                forecast_days=30
            )

    def test_forecast_caching(self, forecast_service, sample_product, sample_sales_data):
        """Тест кэширования результатов прогнозирования"""
        # Given: одинаковые параметры для прогнозирования
        
        # When: рассчитываем прогноз дважды
        with patch.object(forecast_service, '_calculate_base_forecast') as mock_calc:
            mock_calc.return_value = [{'quantity': 10, 'date': datetime.now()}] * 30
            
            forecast1 = forecast_service.calculate_forecast(
                product=sample_product,
                sales_data=sample_sales_data,
                forecast_days=30
            )
            
            forecast2 = forecast_service.calculate_forecast(
                product=sample_product,
                sales_data=sample_sales_data,
                forecast_days=30
            )
            
            # Then: базовый расчет должен быть вызван только один раз (кэширование)
            assert mock_calc.call_count == 1
            assert forecast1 == forecast2

    @pytest.mark.parametrize("forecast_days,expected_length", [
        (7, 7),
        (30, 30),
        (90, 90),
        (365, 365)
    ])
    def test_forecast_different_periods(self, forecast_service, sample_product, 
                                      sample_sales_data, forecast_days, expected_length):
        """Тест прогнозирования на разные периоды"""
        # When: рассчитываем прогноз на разные периоды
        forecast = forecast_service.calculate_forecast(
            product=sample_product,
            sales_data=sample_sales_data,
            forecast_days=forecast_days
        )
        
        # Then: длина прогноза должна соответствовать запрошенному периоду
        assert len(forecast) == expected_length

    def test_forecast_validation(self, forecast_service, sample_product, sample_sales_data):
        """Тест валидации входных данных для прогнозирования"""
        # Given: некорректные данные
        
        # When/Then: проверяем валидацию различных некорректных входных данных
        with pytest.raises(ValueError):
            forecast_service.calculate_forecast(
                product=None,  # Отсутствует товар
                sales_data=sample_sales_data,
                forecast_days=30
            )
        
        with pytest.raises(ValueError):
            forecast_service.calculate_forecast(
                product=sample_product,
                sales_data=pd.DataFrame(),  # Пустые данные
                forecast_days=30
            )
        
        with pytest.raises(ValueError):
            forecast_service.calculate_forecast(
                product=sample_product,
                sales_data=sample_sales_data,
                forecast_days=0  # Некорректный период
            ) 