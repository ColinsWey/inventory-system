#!/usr/bin/env python3
"""
Тест импортов backend модулей
"""

import sys
import os

# Добавляем backend в путь
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

def test_import(module_name, description):
    """Тестирует импорт модуля"""
    try:
        __import__(module_name)
        print(f"✅ {description}: {module_name}")
        return True
    except Exception as e:
        print(f"❌ {description}: {module_name} - {e}")
        return False

def main():
    """Основная функция тестирования"""
    print("🔍 Тестирование импортов backend модулей")
    print("=" * 60)
    
    tests = [
        ("app.main", "Главный модуль"),
        ("app.core.config", "Конфигурация"),
        ("app.core.database.connection", "Подключение к БД"),
        ("app.core.database.init_db", "Инициализация БД"),
        ("app.api.v1.router", "Главный роутер"),
        ("app.api.v1.dependencies", "Зависимости"),
        ("app.api.v1.endpoints.auth", "Авторизация"),
        ("app.api.v1.endpoints.products", "Товары"),
        ("app.api.v1.endpoints.categories", "Категории"),
        ("app.api.v1.endpoints.sales", "Продажи"),
        ("app.api.v1.endpoints.forecasts", "Прогнозы"),
        ("app.api.v1.services.auth_service", "Сервис авторизации"),
        ("app.api.v1.services.product_service", "Сервис товаров"),
        ("app.features.analytics.router", "Аналитика"),
        ("app.features.inventory.router", "Инвентарь"),
        ("app.features.integration.router", "Интеграции"),
    ]
    
    success_count = 0
    
    for module_name, description in tests:
        if test_import(module_name, description):
            success_count += 1
    
    print("=" * 60)
    print(f"✅ Успешно: {success_count}/{len(tests)} модулей")
    
    if success_count == len(tests):
        print("🎉 Все импорты работают!")
    else:
        print("⚠️  Есть проблемы с импортами")

if __name__ == "__main__":
    main() 