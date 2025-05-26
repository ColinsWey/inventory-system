#!/usr/bin/env python3
"""
Скрипт для проверки nginx конфигурации
"""

import subprocess
import os
import tempfile
import shutil

def test_nginx_config(config_file):
    """Тестирует nginx конфигурацию"""
    print(f"🔍 Проверка nginx конфигурации: {config_file}")
    
    if not os.path.exists(config_file):
        print(f"❌ Файл не найден: {config_file}")
        return False
    
    # Читаем конфигурацию
    try:
        with open(config_file, 'r', encoding='utf-8') as f:
            content = f.read()
        print(f"✅ Файл прочитан: {len(content)} символов")
    except Exception as e:
        print(f"❌ Ошибка чтения файла: {e}")
        return False
    
    # Проверяем основные директивы
    checks = [
        ("listen", "listen 80;"),
        ("server_name", "server_name"),
        ("root", "root /usr/share/nginx/html;"),
        ("location /", "location / {"),
        ("location /api/", "location /api/ {"),
        ("gzip", "gzip on;"),
    ]
    
    print("\n📋 Проверка директив:")
    for name, directive in checks:
        if directive in content:
            print(f"✅ {name}: найдено")
        else:
            print(f"❌ {name}: НЕ найдено - {directive}")
    
    # Проверяем проблемные паттерны
    print("\n🔍 Проверка проблемных паттернов:")
    problems = [
        ("must-revalidate в gzip_proxied", "gzip_proxied.*must-revalidate"),
        ("неправильные Cache-Control", 'add_header Cache-Control "must-revalidate"'),
    ]
    
    import re
    for name, pattern in problems:
        if re.search(pattern, content):
            print(f"⚠️  {name}: найдена проблема")
        else:
            print(f"✅ {name}: OK")
    
    # Проверяем синтаксис с помощью nginx (если доступен)
    try:
        # Создаем временный файл для тестирования
        with tempfile.NamedTemporaryFile(mode='w', suffix='.conf', delete=False) as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        
        # Пытаемся проверить синтаксис
        result = subprocess.run(
            ['nginx', '-t', '-c', tmp_path],
            capture_output=True,
            text=True
        )
        
        os.unlink(tmp_path)
        
        if result.returncode == 0:
            print("✅ Nginx синтаксис: OK")
            return True
        else:
            print(f"❌ Nginx синтаксис: {result.stderr}")
            return False
            
    except FileNotFoundError:
        print("⚠️  nginx не найден, пропускаем проверку синтаксиса")
        return True
    except Exception as e:
        print(f"⚠️  Ошибка проверки nginx: {e}")
        return True

def main():
    """Основная функция"""
    config_files = [
        "nginx.conf",
        "default.conf",
        "frontend/nginx.conf",
        "frontend/default.conf"
    ]
    
    print("🔍 Поиск nginx конфигурации...")
    
    found = False
    for config_file in config_files:
        if os.path.exists(config_file):
            print(f"📁 Найден: {config_file}")
            test_nginx_config(config_file)
            found = True
            break
    
    if not found:
        print("❌ Nginx конфигурация не найдена!")
        print("Ожидаемые файлы:", config_files)

if __name__ == "__main__":
    main() 