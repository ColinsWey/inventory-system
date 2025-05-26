#!/usr/bin/env python3
"""
Тестирование подключения к PostgreSQL базе данных.
"""

import os
import sys
import psycopg2
from sqlalchemy import create_engine, text
from app.core.config import settings

def test_psycopg2_connection():
    """Тест подключения через psycopg2."""
    print("🔍 Тестирование подключения через psycopg2...")
    
    try:
        # Парсим DATABASE_URL
        db_url = settings.DATABASE_URL
        print(f"📋 DATABASE_URL: {db_url}")
        
        # Извлекаем параметры подключения
        host = settings.DATABASE_HOST
        port = settings.DATABASE_PORT
        database = settings.DATABASE_NAME
        user = settings.DATABASE_USER
        password = settings.DATABASE_PASSWORD
        
        print(f"📋 Параметры подключения:")
        print(f"   Host: {host}")
        print(f"   Port: {port}")
        print(f"   Database: {database}")
        print(f"   User: {user}")
        print(f"   Password: {'*' * len(password)}")
        
        # Подключение
        conn = psycopg2.connect(
            host=host,
            port=port,
            database=database,
            user=user,
            password=password
        )
        
        cursor = conn.cursor()
        cursor.execute("SELECT version();")
        version = cursor.fetchone()
        
        print(f"✅ Подключение успешно!")
        print(f"📋 PostgreSQL версия: {version[0]}")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Ошибка подключения psycopg2: {e}")
        return False

def test_sqlalchemy_connection():
    """Тест подключения через SQLAlchemy."""
    print("\n🔍 Тестирование подключения через SQLAlchemy...")
    
    try:
        engine = create_engine(settings.DATABASE_URL)
        
        with engine.connect() as connection:
            result = connection.execute(text("SELECT version();"))
            version = result.fetchone()
            
            print(f"✅ SQLAlchemy подключение успешно!")
            print(f"📋 PostgreSQL версия: {version[0]}")
            
        return True
        
    except Exception as e:
        print(f"❌ Ошибка подключения SQLAlchemy: {e}")
        return False

def test_database_exists():
    """Проверка существования базы данных."""
    print("\n🔍 Проверка существования базы данных...")
    
    try:
        # Подключаемся к postgres БД для проверки
        conn = psycopg2.connect(
            host=settings.DATABASE_HOST,
            port=settings.DATABASE_PORT,
            database="postgres",  # Подключаемся к системной БД
            user=settings.DATABASE_USER,
            password=settings.DATABASE_PASSWORD
        )
        
        cursor = conn.cursor()
        cursor.execute(
            "SELECT 1 FROM pg_database WHERE datname = %s;",
            (settings.DATABASE_NAME,)
        )
        
        exists = cursor.fetchone()
        
        if exists:
            print(f"✅ База данных '{settings.DATABASE_NAME}' существует")
        else:
            print(f"❌ База данных '{settings.DATABASE_NAME}' НЕ существует")
            print(f"💡 Создание базы данных...")
            
            # Создаем базу данных
            conn.autocommit = True
            cursor.execute(f"CREATE DATABASE {settings.DATABASE_NAME};")
            print(f"✅ База данных '{settings.DATABASE_NAME}' создана")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Ошибка проверки БД: {e}")
        return False

def main():
    """Основная функция тестирования."""
    print("🚀 Тестирование подключения к PostgreSQL")
    print("=" * 50)
    
    # Выводим настройки
    print(f"📋 Настройки из config.py:")
    print(f"   DATABASE_URL: {settings.DATABASE_URL}")
    print(f"   DATABASE_HOST: {settings.DATABASE_HOST}")
    print(f"   DATABASE_PORT: {settings.DATABASE_PORT}")
    print(f"   DATABASE_NAME: {settings.DATABASE_NAME}")
    print(f"   DATABASE_USER: {settings.DATABASE_USER}")
    print(f"   DATABASE_PASSWORD: {'*' * len(settings.DATABASE_PASSWORD)}")
    
    # Выводим переменные окружения
    print(f"\n📋 Переменные окружения:")
    env_vars = [
        'DATABASE_URL', 'DATABASE_HOST', 'DATABASE_PORT', 
        'DATABASE_NAME', 'DATABASE_USER', 'DATABASE_PASSWORD'
    ]
    for var in env_vars:
        value = os.getenv(var, 'НЕ УСТАНОВЛЕНА')
        if 'PASSWORD' in var and value != 'НЕ УСТАНОВЛЕНА':
            value = '*' * len(value)
        print(f"   {var}: {value}")
    
    print("\n" + "=" * 50)
    
    # Тестируем подключения
    success = True
    
    # 1. Проверяем существование БД
    if not test_database_exists():
        success = False
    
    # 2. Тестируем psycopg2
    if not test_psycopg2_connection():
        success = False
    
    # 3. Тестируем SQLAlchemy
    if not test_sqlalchemy_connection():
        success = False
    
    print("\n" + "=" * 50)
    if success:
        print("🎉 ВСЕ ТЕСТЫ ПРОШЛИ УСПЕШНО!")
        print("✅ Подключение к PostgreSQL работает корректно")
    else:
        print("💥 ЕСТЬ ПРОБЛЕМЫ С ПОДКЛЮЧЕНИЕМ!")
        print("❌ Проверьте настройки PostgreSQL")
        sys.exit(1)

if __name__ == "__main__":
    main() 