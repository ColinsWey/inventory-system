"""
Database package initialization.
Экспорт всех моделей для удобного импорта.
"""

from .models import (
    # Базовые классы
    Base,
    TimestampMixin,
    
    # Enum классы
    UserRole,
    ProductStatus,
    StockStatus,
    MovementType,
    OrderStatus,
    AlertLevel,
    SyncStatus,
    
    # Модели
    User,
    Category,
    ProductTag,
    ProductTagRelation,
    Supplier,
    Product,
    Inventory,
    InventoryMovement,
    Order,
    OrderItem,
    Sale,
    ForecastTemplate,
    SalesForecast,
    UserLog,
    Alert,
    SyncHistory,
    IntegrationConfig,
)

__all__ = [
    # Базовые классы
    "Base",
    "TimestampMixin",
    
    # Enum классы
    "UserRole",
    "ProductStatus", 
    "StockStatus",
    "MovementType",
    "OrderStatus",
    "AlertLevel",
    "SyncStatus",
    
    # Модели
    "User",
    "Category",
    "ProductTag",
    "ProductTagRelation", 
    "Supplier",
    "Product",
    "Inventory",
    "InventoryMovement",
    "Order",
    "OrderItem",
    "Sale",
    "ForecastTemplate",
    "SalesForecast",
    "UserLog",
    "Alert",
    "SyncHistory",
    "IntegrationConfig",
] 