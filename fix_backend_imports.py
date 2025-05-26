#!/usr/bin/env python3
"""
Скрипт для исправления импортов backend.app -> app во всех Python файлах
"""

import os
import re
from pathlib import Path

def fix_imports_in_file(file_path):
    """Исправляет импорты в одном файле"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Паттерны для замены
        patterns = [
            (r'from backend\.app\.', 'from app.'),
            (r'import backend\.app\.', 'import app.'),
            (r'backend\.app\.', 'app.'),
        ]
        
        # Применяем замены
        for pattern, replacement in patterns:
            content = re.sub(pattern, replacement, content)
        
        # Записываем только если были изменения
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅ Исправлен: {file_path}")
            return True
        else:
            print(f"⏭️  Без изменений: {file_path}")
            return False
            
    except Exception as e:
        print(f"❌ Ошибка в {file_path}: {e}")
        return False

def main():
    """Основная функция"""
    backend_dir = Path("backend")
    
    if not backend_dir.exists():
        print("❌ Директория backend не найдена!")
        return
    
    # Находим все Python файлы
    python_files = list(backend_dir.rglob("*.py"))
    
    print(f"🔍 Найдено {len(python_files)} Python файлов")
    print("=" * 50)
    
    fixed_count = 0
    
    for file_path in python_files:
        if fix_imports_in_file(file_path):
            fixed_count += 1
    
    print("=" * 50)
    print(f"✅ Исправлено файлов: {fixed_count}/{len(python_files)}")

if __name__ == "__main__":
    main() 