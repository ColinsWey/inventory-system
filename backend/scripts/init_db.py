#!/usr/bin/env python3
"""
Скрипт инициализации базы данных.
"""

import sys
import os
import logging

# Добавляем путь к приложению
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app.core.database.init_db import init_database

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

if __name__ == "__main__":
    print("🚀 Инициализация базы данных...")
    try:
        init_database()
        print("✅ База данных успешно инициализирована!")
        print("📝 Созданы пользователи:")
        print("   - admin:admin (Администратор)")
        print("   - manager:manager (Менеджер)")
        print("🏷️  Созданы базовые категории и теги")
        print("🏢 Созданы тестовые поставщики")
    except Exception as e:
        print(f"❌ Ошибка инициализации: {e}")
        sys.exit(1) 