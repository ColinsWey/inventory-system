"""
Инициализация базы данных.
"""

import logging
from sqlalchemy.orm import Session

from app.core.database.connection import engine
from app.database.models import Base, User, Category, ProductTag, Supplier
from app.database import UserRole
from app.api.v1.services.auth_service import AuthService

logger = logging.getLogger(__name__)


def create_tables():
    """Создание всех таблиц в базе данных."""
    logger.info("Создание таблиц базы данных...")
    Base.metadata.create_all(bind=engine)
    logger.info("Таблицы созданы успешно")


def create_initial_data(db: Session):
    """Создание начальных данных."""
    logger.info("Создание начальных данных...")
    
    # Создаем администратора
    auth_service = AuthService(db)
    
    # Проверяем, есть ли уже пользователи
    existing_admin = auth_service.get_user_by_username("admin")
    if not existing_admin:
        admin_user = User(
            username="admin",
            email="admin@inventory.local",
            hashed_password=auth_service.get_password_hash("admin"),
            first_name="Администратор",
            last_name="Системы",
            role=UserRole.ADMIN,
            is_active=True
        )
        db.add(admin_user)
        logger.info("Создан пользователь admin")
    
    # Создаем тестового менеджера
    existing_manager = auth_service.get_user_by_username("manager")
    if not existing_manager:
        manager_user = User(
            username="manager",
            email="manager@inventory.local",
            hashed_password=auth_service.get_password_hash("manager"),
            first_name="Менеджер",
            last_name="Склада",
            role=UserRole.MANAGER,
            is_active=True
        )
        db.add(manager_user)
        logger.info("Создан пользователь manager")
    
    # Создаем базовые категории
    categories = [
        {"name": "Электроника", "description": "Электронные товары"},
        {"name": "Одежда", "description": "Одежда и аксессуары"},
        {"name": "Книги", "description": "Книги и печатные издания"},
        {"name": "Спорт", "description": "Спортивные товары"},
        {"name": "Дом и сад", "description": "Товары для дома и сада"}
    ]
    
    for cat_data in categories:
        existing_cat = db.query(Category).filter(Category.name == cat_data["name"]).first()
        if not existing_cat:
            category = Category(**cat_data)
            db.add(category)
            logger.info(f"Создана категория: {cat_data['name']}")
    
    # Создаем базовые теги
    tags = [
        {"name": "Новинка", "color": "#10B981", "description": "Новые товары"},
        {"name": "Акция", "color": "#F59E0B", "description": "Товары по акции"},
        {"name": "Хит продаж", "color": "#EF4444", "description": "Популярные товары"},
        {"name": "Сезонный", "color": "#8B5CF6", "description": "Сезонные товары"},
        {"name": "Эксклюзив", "color": "#EC4899", "description": "Эксклюзивные товары"}
    ]
    
    for tag_data in tags:
        existing_tag = db.query(ProductTag).filter(ProductTag.name == tag_data["name"]).first()
        if not existing_tag:
            tag = ProductTag(**tag_data)
            db.add(tag)
            logger.info(f"Создан тег: {tag_data['name']}")
    
    # Создаем базовых поставщиков
    suppliers = [
        {
            "name": "ООО Поставщик 1",
            "code": "SUP001",
            "contact_person": "Иван Иванов",
            "email": "supplier1@example.com",
            "phone": "+7 (495) 123-45-67",
            "city": "Москва"
        },
        {
            "name": "ООО Поставщик 2", 
            "code": "SUP002",
            "contact_person": "Петр Петров",
            "email": "supplier2@example.com",
            "phone": "+7 (812) 987-65-43",
            "city": "Санкт-Петербург"
        }
    ]
    
    for sup_data in suppliers:
        existing_sup = db.query(Supplier).filter(Supplier.code == sup_data["code"]).first()
        if not existing_sup:
            supplier = Supplier(**sup_data)
            db.add(supplier)
            logger.info(f"Создан поставщик: {sup_data['name']}")
    
    db.commit()
    logger.info("Начальные данные созданы успешно")


def init_database():
    """Полная инициализация базы данных."""
    logger.info("Инициализация базы данных...")
    
    # Создаем таблицы
    create_tables()
    
    # Создаем начальные данные
    from app.core.database.connection import SessionLocal
    db = SessionLocal()
    try:
        create_initial_data(db)
    finally:
        db.close()
    
    logger.info("Инициализация базы данных завершена")


if __name__ == "__main__":
    init_database() 