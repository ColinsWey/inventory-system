#!/usr/bin/env python3
"""Скрипт для исправления оставшихся импортов."""

import re
from pathlib import Path

def fix_test_file():
    """Исправляет импорты в тестовом файле."""
    file_path = Path('backend/tests/test_salesdrive_integration.py')
    
    if not file_path.exists():
        print("❌ Файл не найден!")
        return
    
    content = file_path.read_text(encoding='utf-8')
    original_content = content
    
    # Заменяем все импорты
    content = re.sub(r'from app\.', 'from backend.app.', content)
    
    if content != original_content:
        file_path.write_text(content, encoding='utf-8')
        print('✓ Исправлен: backend/tests/test_salesdrive_integration.py')
    else:
        print('ℹ️ Файл уже исправлен')

if __name__ == "__main__":
    fix_test_file() 