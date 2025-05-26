#!/usr/bin/env python3
"""
Финальный тест валидации email - проверка что backend больше не падает.
"""

from app.api.v1.schemas.auth import UserInfo, UserCreate, UserUpdate
from pydantic import ValidationError

def test_final_email_validation():
    """Финальный тест - backend должен принимать .local домены."""
    print("🚀 ФИНАЛЬНЫЙ ТЕСТ ВАЛИДАЦИИ EMAIL")
    print("=" * 60)
    
    # Тест проблемного email из ошибки
    problematic_email = "admin@inventory.local"
    
    print(f"🔍 Тестирование проблемного email: {problematic_email}")
    
    try:
        # UserInfo - основная схема пользователя
        user_info = UserInfo(
            id="admin_id",
            username="admin", 
            email=problematic_email,
            role="admin",
            is_active=True
        )
        print("✅ UserInfo: email принят успешно")
        
        # UserCreate - создание пользователя
        user_create = UserCreate(
            username="admin",
            email=problematic_email,
            password="admin"
        )
        print("✅ UserCreate: email принят успешно")
        
        # UserUpdate - обновление пользователя
        user_update = UserUpdate(email=problematic_email)
        print("✅ UserUpdate: email принят успешно")
        
        print("=" * 60)
        print("🎉 ВСЕ ТЕСТЫ ПРОШЛИ УСПЕШНО!")
        print("✅ Backend больше НЕ падает на email 'admin@inventory.local'")
        print("✅ Проблема валидации email РЕШЕНА")
        print("✅ Кастомный валидатор поддерживает .local домены")
        print("=" * 60)
        
        return True
        
    except ValidationError as e:
        print(f"❌ ОШИБКА ВАЛИДАЦИИ: {e}")
        print("💥 Backend все еще падает на .local доменах!")
        return False
    except Exception as e:
        print(f"❌ НЕОЖИДАННАЯ ОШИБКА: {e}")
        return False

if __name__ == "__main__":
    success = test_final_email_validation()
    exit(0 if success else 1) 