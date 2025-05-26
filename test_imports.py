#!/usr/bin/env python3
"""Тест импортов для проверки совместимости с Pydantic v2."""

import sys
import traceback

def test_import(module_name, description):
    """Тестирует импорт модуля."""
    try:
        exec(f"import {module_name}")
        print(f"✓ {description}: OK")
        return True
    except Exception as e:
        print(f"✗ {description}: ОШИБКА - {e}")
        traceback.print_exc()
        return False

def main():
    """Основная функция тестирования."""
    print("=== ТЕСТ ИМПОРТОВ PYDANTIC V2 ===\n")
    
    tests = [
        ("backend.app.core.config", "Конфигурация"),
        ("backend.app.api.v1.schemas.auth", "Схемы аутентификации"),
        ("backend.app.api.v1.schemas.product", "Схемы продуктов"),
        ("backend.app.api.v1.schemas.forecast", "Схемы прогнозирования"),
        ("backend.app.api.v1.schemas.salesdrive", "Схемы SalesDrive"),
        ("backend.app.api.v1.schemas.import_data", "Схемы импорта"),
        ("backend.app.api.v1.schemas.category", "Схемы категорий"),
        ("backend.app.api.v1.schemas.common", "Общие схемы"),
        ("backend.app.features.auth.schemas", "Схемы auth feature"),
        ("backend.app.features.inventory.schemas", "Схемы inventory feature"),
        ("backend.app.features.analytics.schemas", "Схемы analytics feature"),
        ("backend.app.features.integration.schemas", "Схемы integration feature"),
    ]
    
    success_count = 0
    total_count = len(tests)
    
    for module_name, description in tests:
        if test_import(module_name, description):
            success_count += 1
        print()
    
    print(f"=== РЕЗУЛЬТАТ: {success_count}/{total_count} модулей импортированы успешно ===")
    
    if success_count == total_count:
        print("🎉 ВСЕ ИМПОРТЫ РАБОТАЮТ! Pydantic v2 совместимость OK!")
    else:
        print("❌ ЕСТЬ ПРОБЛЕМЫ С ИМПОРТАМИ!")

if __name__ == "__main__":
    main() 