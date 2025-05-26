#!/usr/bin/env python3
"""
Тестирование подключения к локальному PostgreSQL.
"""

import os
import sys
import psycopg2
from sqlalchemy import create_engine, text

# Локальные настройки для тестирования
LOCAL_DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'inventory_system',
    'user': 'postgres',
    'password': 'postgres'
}

def test_local_connection():
    """Тест подключения к локальному PostgreSQL."""
    print("🔍 Тестирование подключения к локальному PostgreSQL...")
    
    try:
        print(f"📋 Параметры подключения:")
        print(f"   Host: {LOCAL_DB_CONFIG['host']}")
        print(f"   Port: {LOCAL_DB_CONFIG['port']}")
        print(f"   Database: {LOCAL_DB_CONFIG['database']}")
        print(f"   User: {LOCAL_DB_CONFIG['user']}")
        print(f"   Password: {'*' * len(LOCAL_DB_CONFIG['password'])}")
        
        # Подключение
        conn = psycopg2.connect(**LOCAL_DB_CONFIG)
        
        cursor = conn.cursor()
        cursor.execute("SELECT version();")
        version = cursor.fetchone()
        
        print(f"✅ Подключение успешно!")
        print(f"📋 PostgreSQL версия: {version[0]}")
        
        cursor.close()
        conn.close()
        return True
        
    except psycopg2.OperationalError as e:
        if "password authentication failed" in str(e):
            print(f"❌ Ошибка аутентификации: {e}")
            print(f"💡 Проверьте пароль PostgreSQL")
        elif "could not connect to server" in str(e):
            print(f"❌ Не удается подключиться к серверу: {e}")
            print(f"💡 Убедитесь что PostgreSQL запущен на localhost:5432")
        else:
            print(f"❌ Ошибка подключения: {e}")
        return False
        
    except Exception as e:
        print(f"❌ Неожиданная ошибка: {e}")
        return False

def test_database_creation():
    """Тест создания базы данных."""
    print("\n🔍 Проверка/создание базы данных...")
    
    try:
        # Подключаемся к postgres БД
        config = LOCAL_DB_CONFIG.copy()
        config['database'] = 'postgres'
        
        conn = psycopg2.connect(**config)
        conn.autocommit = True
        
        cursor = conn.cursor()
        
        # Проверяем существование БД
        cursor.execute(
            "SELECT 1 FROM pg_database WHERE datname = %s;",
            (LOCAL_DB_CONFIG['database'],)
        )
        
        exists = cursor.fetchone()
        
        if exists:
            print(f"✅ База данных '{LOCAL_DB_CONFIG['database']}' существует")
        else:
            print(f"❌ База данных '{LOCAL_DB_CONFIG['database']}' НЕ существует")
            print(f"💡 Создание базы данных...")
            
            # Создаем базу данных
            cursor.execute(f"CREATE DATABASE {LOCAL_DB_CONFIG['database']};")
            print(f"✅ База данных '{LOCAL_DB_CONFIG['database']}' создана")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Ошибка работы с БД: {e}")
        return False

def test_sqlalchemy_local():
    """Тест SQLAlchemy с локальными настройками."""
    print("\n🔍 Тестирование SQLAlchemy с локальными настройками...")
    
    try:
        db_url = f"postgresql://{LOCAL_DB_CONFIG['user']}:{LOCAL_DB_CONFIG['password']}@{LOCAL_DB_CONFIG['host']}:{LOCAL_DB_CONFIG['port']}/{LOCAL_DB_CONFIG['database']}"
        print(f"📋 DATABASE_URL: {db_url}")
        
        engine = create_engine(db_url)
        
        with engine.connect() as connection:
            result = connection.execute(text("SELECT version();"))
            version = result.fetchone()
            
            print(f"✅ SQLAlchemy подключение успешно!")
            print(f"📋 PostgreSQL версия: {version[0]}")
            
        return True
        
    except Exception as e:
        print(f"❌ Ошибка SQLAlchemy: {e}")
        return False

def main():
    """Основная функция тестирования."""
    print("🚀 Тестирование локального PostgreSQL")
    print("=" * 50)
    
    success = True
    
    # 1. Тестируем базовое подключение
    if not test_local_connection():
        success = False
        print("\n💡 Возможные решения:")
        print("   1. Установите PostgreSQL: https://www.postgresql.org/download/")
        print("   2. Запустите PostgreSQL сервис")
        print("   3. Создайте пользователя 'postgres' с паролем 'postgres'")
        print("   4. Или измените настройки в LOCAL_DB_CONFIG")
        return
    
    # 2. Проверяем/создаем БД
    if not test_database_creation():
        success = False
    
    # 3. Тестируем SQLAlchemy
    if not test_sqlalchemy_local():
        success = False
    
    print("\n" + "=" * 50)
    if success:
        print("🎉 ВСЕ ТЕСТЫ ПРОШЛИ УСПЕШНО!")
        print("✅ Локальный PostgreSQL работает корректно")
        print("\n💡 Для использования в приложении обновите config.py:")
        print(f"   DATABASE_HOST: 'localhost'")
        print(f"   DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/inventory_system'")
    else:
        print("💥 ЕСТЬ ПРОБЛЕМЫ С ПОДКЛЮЧЕНИЕМ!")
        print("❌ Проверьте настройки PostgreSQL")

if __name__ == "__main__":
    main() 