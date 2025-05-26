#!/usr/bin/env python3
"""
Тестирование валидации email после исправления.
"""

from app.api.v1.schemas.auth import UserInfo, UserCreate, UserUpdate
from pydantic import ValidationError

def test_userinfo_email_validation():
    """Тест валидации email в UserInfo."""
    print("🔍 Тестирование валидации email в UserInfo...")
    
    # Тест с .local доменом
    try:
        user = UserInfo(
            id="123",
            username="admin",
            email="admin@inventory.local",
            role="admin",
            is_active=True
        )
        print("✅ Email 'admin@inventory.local' прошел валидацию")
    except ValidationError as e:
        print(f"❌ Email 'admin@inventory.local' не прошел валидацию: {e}")
        return False
    
    # Тест с обычным email
    try:
        user = UserInfo(
            id="123",
            username="user",
            email="user@example.com",
            role="viewer",
            is_active=True
        )
        print("✅ Email 'user@example.com' прошел валидацию")
    except ValidationError as e:
        print(f"❌ Email 'user@example.com' не прошел валидацию: {e}")
        return False
    
    # Тест с некорректным email
    try:
        user = UserInfo(
            id="123",
            username="bad",
            email="invalid-email",
            role="viewer",
            is_active=True
        )
        print("❌ Email 'invalid-email' НЕ должен проходить валидацию!")
        return False
    except ValidationError:
        print("✅ Email 'invalid-email' правильно отклонен")
    
    return True

def test_usercreate_email_validation():
    """Тест валидации email в UserCreate."""
    print("\n🔍 Тестирование валидации email в UserCreate...")
    
    try:
        user = UserCreate(
            username="testuser",
            email="admin@inventory.local",
            password="admin"
        )
        print("✅ Email 'admin@inventory.local' в UserCreate прошел валидацию")
        return True
    except ValidationError as e:
        print(f"❌ Email 'admin@inventory.local' в UserCreate не прошел валидацию: {e}")
        return False

def test_userupdate_email_validation():
    """Тест валидации email в UserUpdate."""
    print("\n🔍 Тестирование валидации email в UserUpdate...")
    
    # Тест с .local доменом
    try:
        update = UserUpdate(email="manager@inventory.local")
        print("✅ Email 'manager@inventory.local' в UserUpdate прошел валидацию")
    except ValidationError as e:
        print(f"❌ Email 'manager@inventory.local' в UserUpdate не прошел валидацию: {e}")
        return False
    
    # Тест с None (должен работать для Optional поля)
    try:
        update = UserUpdate(email=None)
        print("✅ Email None в UserUpdate прошел валидацию")
    except ValidationError as e:
        print(f"❌ Email None в UserUpdate не прошел валидацию: {e}")
        return False
    
    # Тест без email поля
    try:
        update = UserUpdate(first_name="Тест")
        print("✅ UserUpdate без email поля прошел валидацию")
        return True
    except ValidationError as e:
        print(f"❌ UserUpdate без email поля не прошел валидацию: {e}")
        return False

def test_various_email_formats():
    """Тест различных форматов email."""
    print("\n🔍 Тестирование различных форматов email...")
    
    valid_emails = [
        "admin@inventory.local",
        "user@example.com",
        "test.user@domain.org",
        "user+tag@example.co.uk",
        "123@test.local"
    ]
    
    invalid_emails = [
        "invalid-email",
        "@domain.com",
        "user@",
        "user@domain",
        "user.domain.com"
    ]
    
    success = True
    
    # Тест валидных email
    for email in valid_emails:
        try:
            user = UserInfo(
                id="123",
                username="test",
                email=email,
                role="viewer",
                is_active=True
            )
            print(f"✅ Email '{email}' прошел валидацию")
        except ValidationError as e:
            print(f"❌ Email '{email}' должен проходить валидацию: {e}")
            success = False
    
    # Тест невалидных email
    for email in invalid_emails:
        try:
            user = UserInfo(
                id="123",
                username="test",
                email=email,
                role="viewer",
                is_active=True
            )
            print(f"❌ Email '{email}' НЕ должен проходить валидацию!")
            success = False
        except ValidationError:
            print(f"✅ Email '{email}' правильно отклонен")
    
    return success

def main():
    """Основная функция тестирования."""
    print("🚀 Тестирование валидации email после исправления")
    print("=" * 60)
    
    success = True
    
    # Тестируем все схемы
    if not test_userinfo_email_validation():
        success = False
    
    if not test_usercreate_email_validation():
        success = False
    
    if not test_userupdate_email_validation():
        success = False
    
    if not test_various_email_formats():
        success = False
    
    print("\n" + "=" * 60)
    if success:
        print("🎉 ВСЕ ТЕСТЫ ПРОШЛИ УСПЕШНО!")
        print("✅ Email 'admin@inventory.local' теперь проходит валидацию")
        print("✅ Поддерживаются как обычные email, так и .local домены")
        print("✅ Кастомный валидатор работает корректно")
        print("\n💡 Backend больше не падает на email с .local доменами")
    else:
        print("💥 ЕСТЬ ПРОБЛЕМЫ С ВАЛИДАЦИЕЙ EMAIL!")
        print("❌ Проверьте настройки валидаторов")

if __name__ == "__main__":
    main() 