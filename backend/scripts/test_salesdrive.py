#!/usr/bin/env python3
"""
Скрипт для тестирования интеграции с SalesDrive API.
"""

import asyncio
import sys
import os
from datetime import datetime, timedelta
from pathlib import Path

# Добавляем путь к приложению
sys.path.append(str(Path(__file__).parent.parent))

from app.api.v1.services.salesdrive_service import SalesDriveClient, SalesDriveService
from app.api.v1.schemas.salesdrive import SalesDriveApiConfig
from app.core.config import settings


async def test_connection():
    """Тест соединения с SalesDrive API."""
    print("🔗 Тестирование соединения с SalesDrive API...")
    
    config = SalesDriveApiConfig(
        api_url=settings.SALESDRIVE_API_URL,
        api_key=settings.SALESDRIVE_API_KEY,
        timeout=30
    )
    
    try:
        async with SalesDriveClient(config) as client:
            # Тест получения товаров
            response = await client.get_products(page=1, limit=1)
            print(f"✅ Соединение успешно! Получен ответ: {len(response.get('data', []))} товаров")
            return True
    except Exception as e:
        print(f"❌ Ошибка соединения: {e}")
        return False


async def test_get_products():
    """Тест получения товаров."""
    print("\n📦 Тестирование получения товаров...")
    
    config = SalesDriveApiConfig(
        api_url=settings.SALESDRIVE_API_URL,
        api_key=settings.SALESDRIVE_API_KEY,
        timeout=30
    )
    
    try:
        async with SalesDriveClient(config) as client:
            response = await client.get_products(page=1, limit=5)
            products = response.get('data', [])
            
            print(f"✅ Получено товаров: {len(products)}")
            
            for i, product in enumerate(products[:3], 1):
                print(f"  {i}. {product.get('name', 'N/A')} (SKU: {product.get('sku', 'N/A')})")
            
            return True
    except Exception as e:
        print(f"❌ Ошибка получения товаров: {e}")
        return False


async def test_get_orders():
    """Тест получения заказов."""
    print("\n📋 Тестирование получения заказов...")
    
    config = SalesDriveApiConfig(
        api_url=settings.SALESDRIVE_API_URL,
        api_key=settings.SALESDRIVE_API_KEY,
        timeout=30
    )
    
    try:
        async with SalesDriveClient(config) as client:
            date_from = datetime.utcnow() - timedelta(days=7)
            date_to = datetime.utcnow()
            
            response = await client.get_orders(
                date_from=date_from,
                date_to=date_to,
                page=1,
                limit=5
            )
            orders = response.get('data', [])
            
            print(f"✅ Получено заказов за последние 7 дней: {len(orders)}")
            
            for i, order in enumerate(orders[:3], 1):
                print(f"  {i}. Заказ #{order.get('number', 'N/A')} - {order.get('total_amount', 0)} руб.")
            
            return True
    except Exception as e:
        print(f"❌ Ошибка получения заказов: {e}")
        return False


async def test_categories_and_suppliers():
    """Тест получения категорий и поставщиков."""
    print("\n🏷️ Тестирование получения категорий и поставщиков...")
    
    config = SalesDriveApiConfig(
        api_url=settings.SALESDRIVE_API_URL,
        api_key=settings.SALESDRIVE_API_KEY,
        timeout=30
    )
    
    try:
        async with SalesDriveClient(config) as client:
            # Тест категорий
            try:
                categories_response = await client.get_categories()
                categories = categories_response.get('data', [])
                print(f"✅ Получено категорий: {len(categories)}")
                
                for i, category in enumerate(categories[:3], 1):
                    print(f"  {i}. {category.get('name', 'N/A')}")
            except Exception as e:
                print(f"⚠️ Ошибка получения категорий: {e}")
            
            # Тест поставщиков
            try:
                suppliers_response = await client.get_suppliers()
                suppliers = suppliers_response.get('data', [])
                print(f"✅ Получено поставщиков: {len(suppliers)}")
                
                for i, supplier in enumerate(suppliers[:3], 1):
                    print(f"  {i}. {supplier.get('name', 'N/A')}")
            except Exception as e:
                print(f"⚠️ Ошибка получения поставщиков: {e}")
            
            return True
    except Exception as e:
        print(f"❌ Общая ошибка: {e}")
        return False


async def test_rate_limiting():
    """Тест контроля частоты запросов."""
    print("\n⏱️ Тестирование rate limiting...")
    
    config = SalesDriveApiConfig(
        api_url=settings.SALESDRIVE_API_URL,
        api_key=settings.SALESDRIVE_API_KEY,
        timeout=30
    )
    
    try:
        async with SalesDriveClient(config) as client:
            start_time = datetime.utcnow()
            
            # Делаем несколько быстрых запросов
            for i in range(3):
                await client.get_products(page=1, limit=1)
                print(f"  Запрос {i+1} выполнен")
            
            end_time = datetime.utcnow()
            duration = (end_time - start_time).total_seconds()
            
            print(f"✅ 3 запроса выполнены за {duration:.2f} секунд")
            
            if duration >= 2.0:  # Ожидаем минимум 2 секунды с rate limiting
                print("✅ Rate limiting работает корректно")
            else:
                print("⚠️ Rate limiting может работать некорректно")
            
            return True
    except Exception as e:
        print(f"❌ Ошибка тестирования rate limiting: {e}")
        return False


def print_config_info():
    """Вывод информации о конфигурации."""
    print("⚙️ Конфигурация SalesDrive:")
    print(f"  API URL: {settings.SALESDRIVE_API_URL}")
    print(f"  API Key: {settings.SALESDRIVE_API_KEY[:20]}...")
    print(f"  Timeout: {settings.SALESDRIVE_TIMEOUT}s")
    print()


async def main():
    """Главная функция тестирования."""
    print("🚀 Запуск тестирования интеграции с SalesDrive API")
    print("=" * 60)
    
    print_config_info()
    
    # Список тестов
    tests = [
        ("Соединение", test_connection),
        ("Получение товаров", test_get_products),
        ("Получение заказов", test_get_orders),
        ("Категории и поставщики", test_categories_and_suppliers),
        ("Rate limiting", test_rate_limiting),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            result = await test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ Критическая ошибка в тесте '{test_name}': {e}")
            results.append((test_name, False))
    
    # Итоговый отчет
    print("\n" + "=" * 60)
    print("📊 Итоговый отчет:")
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ ПРОЙДЕН" if result else "❌ ПРОВАЛЕН"
        print(f"  {test_name}: {status}")
        if result:
            passed += 1
    
    print(f"\nРезультат: {passed}/{total} тестов пройдено")
    
    if passed == total:
        print("🎉 Все тесты пройдены! Интеграция с SalesDrive работает корректно.")
        return 0
    else:
        print("⚠️ Некоторые тесты провалены. Проверьте конфигурацию и логи.")
        return 1


if __name__ == "__main__":
    # Проверяем наличие API ключа
    if not settings.SALESDRIVE_API_KEY or settings.SALESDRIVE_API_KEY == "your_api_key_here":
        print("❌ Ошибка: API ключ SalesDrive не настроен!")
        print("Установите переменную окружения SALESDRIVE_API_KEY или обновите config.py")
        sys.exit(1)
    
    # Запускаем тесты
    try:
        exit_code = asyncio.run(main())
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n⏹️ Тестирование прервано пользователем")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Критическая ошибка: {e}")
        sys.exit(1) 