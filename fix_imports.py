#!/usr/bin/env python3
"""Скрипт для исправления импортов в проекте."""

import os
import re
from pathlib import Path

def fix_imports_in_file(file_path):
    """Исправляет импорты в одном файле."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Заменяем импорты
        original_content = content
        content = re.sub(r'^from app\.', 'from backend.app.', content, flags=re.MULTILINE)
        
        # Если были изменения, записываем файл
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✓ Исправлен: {file_path}")
            return True
        else:
            return False
    except Exception as e:
        print(f"✗ Ошибка в {file_path}: {e}")
        return False

def main():
    """Основная функция."""
    print("=== ИСПРАВЛЕНИЕ ИМПОРТОВ ===\n")
    
    backend_dir = Path("backend")
    if not backend_dir.exists():
        print("❌ Директория backend не найдена!")
        return
    
    # Находим все Python файлы
    python_files = list(backend_dir.rglob("*.py"))
    
    fixed_count = 0
    total_count = len(python_files)
    
    for file_path in python_files:
        if fix_imports_in_file(file_path):
            fixed_count += 1
    
    print(f"\n=== РЕЗУЛЬТАТ ===")
    print(f"Обработано файлов: {total_count}")
    print(f"Исправлено файлов: {fixed_count}")
    
    if fixed_count > 0:
        print("🎉 Импорты успешно исправлены!")
    else:
        print("ℹ️ Все импорты уже корректны.")

if __name__ == "__main__":
    main() 