#!/usr/bin/env python3
"""
Тестирование валидации пароля после исправления.
"""

from app.api.v1.schemas.auth import LoginRequest, UserCreate, PasswordChange
from pydantic import ValidationError

def test_login_password_validation():
    """Тест валидации пароля в LoginRequest."""
    print("🔍 Тестирование валидации пароля в LoginRequest...")
    
    # Тест с паролем "admin" (5 символов)
    try:
        req = LoginRequest(username="admin", password="admin")
        print("✅ Пароль 'admin' (5 символов) прошел валидацию")
    except ValidationError as e:
        print(f"❌ Пароль 'admin' не прошел валидацию: {e}")
        return False
    
    # Тест с коротким паролем (2 символа)
    try:
        req = LoginRequest(username="admin", password="ab")
        print("❌ Пароль 'ab' (2 символов) НЕ должен проходить валидацию!")
        return False
    except ValidationError:
        print("✅ Пароль 'ab' (2 символа) правильно отклонен")
    
    # Тест с длинным паролем
    try:
        req = LoginRequest(username="admin", password="admin123")
        print("✅ Пароль 'admin123' (8 символов) прошел валидацию")
    except ValidationError as e:
        print(f"❌ Пароль 'admin123' не прошел валидацию: {e}")
        return False
    
    return True

def test_user_create_password_validation():
    """Тест валидации пароля в UserCreate."""
    print("\n🔍 Тестирование валидации пароля в UserCreate...")
    
    try:
        user = UserCreate(
            username="testuser",
            email="test@example.com",
            password="admin"  # 5 символов
        )
        print("✅ Пароль 'admin' в UserCreate прошел валидацию")
        return True
    except ValidationError as e:
        print(f"❌ Пароль 'admin' в UserCreate не прошел валидацию: {e}")
        return False

def test_password_change_validation():
    """Тест валидации пароля в PasswordChange."""
    print("\n🔍 Тестирование валидации пароля в PasswordChange...")
    
    try:
        change = PasswordChange(
            current_password="old",
            new_password="new"  # 3 символа - минимум
        )
        print("✅ Новый пароль 'new' (3 символа) прошел валидацию")
        return True
    except ValidationError as e:
        print(f"❌ Новый пароль 'new' не прошел валидацию: {e}")
        return False

def main():
    """Основная функция тестирования."""
    print("🚀 Тестирование валидации паролей после исправления")
    print("=" * 60)
    
    success = True
    
    # Тестируем все схемы
    if not test_login_password_validation():
        success = False
    
    if not test_user_create_password_validation():
        success = False
    
    if not test_password_change_validation():
        success = False
    
    print("\n" + "=" * 60)
    if success:
        print("🎉 ВСЕ ТЕСТЫ ПРОШЛИ УСПЕШНО!")
        print("✅ Пароль 'admin' теперь проходит валидацию во всех схемах")
        print("✅ Минимальная длина пароля изменена с 6 на 3 символа")
        print("\n💡 Пользователь может войти с данными: admin/admin")
    else:
        print("💥 ЕСТЬ ПРОБЛЕМЫ С ВАЛИДАЦИЕЙ!")
        print("❌ Проверьте настройки схем")

if __name__ == "__main__":
    main() 