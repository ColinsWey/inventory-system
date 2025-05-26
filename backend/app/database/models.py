"""
Модели SQLAlchemy для системы управления товарными остатками.
"""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, List

from sqlalchemy import (
    Column, String, Integer, Boolean, DateTime, Text, 
    DECIMAL, ForeignKey, UniqueConstraint, Index,
    Enum as SQLEnum, JSON, Date
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum


Base = declarative_base()


# Перечисления
class UserRole(str, enum.Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    OPERATOR = "operator"
    VIEWER = "viewer"


class ProductStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    DISCONTINUED = "discontinued"


class StockStatus(str, enum.Enum):
    IN_STOCK = "in_stock"
    LOW_STOCK = "low_stock"
    OUT_OF_STOCK = "out_of_stock"
    RESERVED = "reserved"


class MovementType(str, enum.Enum):
    IN = "in"
    OUT = "out"
    ADJUSTMENT = "adjustment"
    TRANSFER = "transfer"
    RETURN = "return"


class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class AlertLevel(str, enum.Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class SyncStatus(str, enum.Enum):
    IDLE = "idle"
    RUNNING = "running"
    SUCCESS = "success"
    ERROR = "error"
    PARTIAL = "partial"


# Базовый класс с общими полями
class TimestampMixin:
    created_at = Column(DateTime, default=func.current_timestamp(), nullable=False)
    updated_at = Column(DateTime, default=func.current_timestamp(), onupdate=func.current_timestamp())


class User(Base, TimestampMixin):
    """Модель пользователя."""
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    first_name = Column(String(100))
    last_name = Column(String(100))
    role = Column(SQLEnum(UserRole), default=UserRole.VIEWER)
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime)

    # Связи
    created_movements = relationship("InventoryMovement", back_populates="created_by_user")
    created_orders = relationship("Order", back_populates="created_by_user")
    created_sales = relationship("Sale", back_populates="created_by_user")
    user_logs = relationship("UserLog", back_populates="user")
    resolved_alerts = relationship("Alert", back_populates="resolved_by_user")

    def __repr__(self):
        return f"<User(username='{self.username}', role='{self.role}')>"


class Category(Base, TimestampMixin):
    """Модель категории товаров."""
    __tablename__ = "categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    parent_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"))
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)

    # Связи
    parent = relationship("Category", remote_side=[id])
    children = relationship("Category")
    products = relationship("Product", back_populates="category")
    forecast_templates = relationship("ForecastTemplate", back_populates="category")

    def __repr__(self):
        return f"<Category(name='{self.name}')>"


class ProductTag(Base, TimestampMixin):
    """Модель тега товара."""
    __tablename__ = "product_tags"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(50), unique=True, nullable=False)
    color = Column(String(7), default="#6B7280")
    description = Column(Text)

    def __repr__(self):
        return f"<ProductTag(name='{self.name}')>"


class Supplier(Base, TimestampMixin):
    """Модель поставщика."""
    __tablename__ = "suppliers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    code = Column(String(50), unique=True)
    contact_person = Column(String(100))
    email = Column(String(100))
    phone = Column(String(20))
    address = Column(Text)
    city = Column(String(100))
    country = Column(String(100), default="Россия")
    tax_id = Column(String(50))
    payment_terms = Column(Integer, default=30)
    is_active = Column(Boolean, default=True)
    rating = Column(DECIMAL(3, 2), default=Decimal("5.00"))
    notes = Column(Text)

    # Связи
    products = relationship("Product", back_populates="supplier")
    movements = relationship("InventoryMovement", back_populates="supplier")

    def __repr__(self):
        return f"<Supplier(name='{self.name}', code='{self.code}')>"


class Product(Base, TimestampMixin):
    """Модель товара."""
    __tablename__ = "products"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    sku = Column(String(100), unique=True, nullable=False)
    barcode = Column(String(100))
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"))
    supplier_id = Column(UUID(as_uuid=True), ForeignKey("suppliers.id"))
    description = Column(Text)
    specifications = Column(JSONB)
    unit_price = Column(DECIMAL(12, 2), nullable=False, default=0)
    cost_price = Column(DECIMAL(12, 2), default=0)
    weight = Column(DECIMAL(8, 3))
    dimensions = Column(JSONB)
    unit_of_measure = Column(String(20), default="шт")
    status = Column(SQLEnum(ProductStatus), default=ProductStatus.ACTIVE)
    is_serialized = Column(Boolean, default=False)
    warranty_months = Column(Integer, default=0)

    # Связи
    category = relationship("Category", back_populates="products")
    supplier = relationship("Supplier", back_populates="products")
    inventory_records = relationship("Inventory", back_populates="product")
    movements = relationship("InventoryMovement", back_populates="product")
    order_items = relationship("OrderItem", back_populates="product")
    sales = relationship("Sale", back_populates="product")
    forecasts = relationship("SalesForecast", back_populates="product")
    alerts = relationship("Alert", back_populates="product")
    tags = relationship("ProductTag", secondary="product_tag_relations")

    def __repr__(self):
        return f"<Product(sku='{self.sku}', name='{self.name}')>"


class ProductTagRelation(Base):
    """Связь товаров с тегами."""
    __tablename__ = "product_tag_relations"

    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), primary_key=True)
    tag_id = Column(UUID(as_uuid=True), ForeignKey("product_tags.id"), primary_key=True)
    created_at = Column(DateTime, default=func.current_timestamp())


class Inventory(Base, TimestampMixin):
    """Модель складских остатков."""
    __tablename__ = "inventory"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    location = Column(String(100), default="Основной склад")
    quantity = Column(Integer, nullable=False, default=0)
    reserved_quantity = Column(Integer, default=0)
    min_quantity = Column(Integer, nullable=False, default=0)
    max_quantity = Column(Integer)
    reorder_point = Column(Integer)
    stock_status = Column(SQLEnum(StockStatus), default=StockStatus.IN_STOCK)
    last_counted_at = Column(DateTime)

    # Связи
    product = relationship("Product", back_populates="inventory_records")

    __table_args__ = (
        UniqueConstraint('product_id', 'location', name='uq_inventory_product_location'),
    )

    def __repr__(self):
        return f"<Inventory(product_id='{self.product_id}', quantity={self.quantity})>"


class InventoryMovement(Base):
    """Модель движения товаров."""
    __tablename__ = "inventory_movements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"))
    location = Column(String(100))
    movement_type = Column(SQLEnum(MovementType), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(DECIMAL(12, 2))
    total_amount = Column(DECIMAL(12, 2))
    reason = Column(String(255))
    reference_number = Column(String(100))
    document_number = Column(String(100))
    supplier_id = Column(UUID(as_uuid=True), ForeignKey("suppliers.id"))
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime, default=func.current_timestamp())

    # Связи
    product = relationship("Product", back_populates="movements")
    supplier = relationship("Supplier", back_populates="movements")
    created_by_user = relationship("User", back_populates="created_movements")

    def __repr__(self):
        return f"<InventoryMovement(type='{self.movement_type}', quantity={self.quantity})>"


class Order(Base, TimestampMixin):
    """Модель заказа."""
    __tablename__ = "orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_number = Column(String(100), unique=True, nullable=False)
    customer_name = Column(String(255))
    customer_email = Column(String(100))
    customer_phone = Column(String(20))
    customer_address = Column(Text)
    status = Column(SQLEnum(OrderStatus), default=OrderStatus.PENDING)
    order_date = Column(DateTime, default=func.current_timestamp())
    required_date = Column(DateTime)
    shipped_date = Column(DateTime)
    delivered_date = Column(DateTime)
    total_amount = Column(DECIMAL(12, 2), default=0)
    discount_amount = Column(DECIMAL(12, 2), default=0)
    tax_amount = Column(DECIMAL(12, 2), default=0)
    notes = Column(Text)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))

    # Связи
    created_by_user = relationship("User", back_populates="created_orders")
    items = relationship("OrderItem", back_populates="order")
    sales = relationship("Sale", back_populates="order")

    def __repr__(self):
        return f"<Order(number='{self.order_number}', status='{self.status}')>"


class OrderItem(Base):
    """Модель позиции заказа."""
    __tablename__ = "order_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"))
    quantity = Column(Integer, nullable=False)
    unit_price = Column(DECIMAL(12, 2), nullable=False)
    discount_percent = Column(DECIMAL(5, 2), default=0)
    total_amount = Column(DECIMAL(12, 2), nullable=False)
    created_at = Column(DateTime, default=func.current_timestamp())

    # Связи
    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")

    def __repr__(self):
        return f"<OrderItem(order_id='{self.order_id}', quantity={self.quantity})>"


class ForecastTemplate(Base, TimestampMixin):
    """Модель шаблона прогнозирования."""
    __tablename__ = "forecast_templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"))
    seasonal_factors = Column(JSONB, nullable=False)
    trend_factor = Column(DECIMAL(5, 4), default=Decimal("1.0000"))
    is_active = Column(Boolean, default=True)

    # Связи
    category = relationship("Category", back_populates="forecast_templates")
    forecasts = relationship("SalesForecast", back_populates="template")

    def __repr__(self):
        return f"<ForecastTemplate(name='{self.name}')>"


class Sale(Base, TimestampMixin):
    """Модель продажи."""
    __tablename__ = "sales"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(DECIMAL(12, 2), nullable=False)
    total_amount = Column(DECIMAL(12, 2), nullable=False)
    sale_date = Column(DateTime, default=func.current_timestamp())
    customer_name = Column(String(255))
    customer_email = Column(String(100))
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id"))
    location = Column(String(100), default="Основной склад")
    discount_amount = Column(DECIMAL(12, 2), default=0)
    tax_amount = Column(DECIMAL(12, 2), default=0)
    payment_method = Column(String(50))
    notes = Column(Text)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))

    # Связи
    product = relationship("Product", back_populates="sales")
    order = relationship("Order", back_populates="sales")
    created_by_user = relationship("User", back_populates="created_sales")

    def __repr__(self):
        return f"<Sale(product_id='{self.product_id}', quantity={self.quantity}, amount={self.total_amount})>"


class SalesForecast(Base):
    """Модель прогноза продаж."""
    __tablename__ = "sales_forecasts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"))
    forecast_date = Column(Date, nullable=False)
    predicted_quantity = Column(Integer, nullable=False)
    confidence_level = Column(DECIMAL(5, 2), default=Decimal("0.80"))
    template_id = Column(UUID(as_uuid=True), ForeignKey("forecast_templates.id"))
    actual_quantity = Column(Integer)
    created_at = Column(DateTime, default=func.current_timestamp())

    # Связи
    product = relationship("Product", back_populates="forecasts")
    template = relationship("ForecastTemplate", back_populates="forecasts")

    __table_args__ = (
        UniqueConstraint('product_id', 'forecast_date', name='uq_forecast_product_date'),
    )

    def __repr__(self):
        return f"<SalesForecast(product_id='{self.product_id}', date='{self.forecast_date}')>"


class UserLog(Base):
    """Модель логов действий пользователей."""
    __tablename__ = "user_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    action = Column(String(100), nullable=False)
    entity_type = Column(String(50))
    entity_id = Column(UUID(as_uuid=True))
    old_values = Column(JSONB)
    new_values = Column(JSONB)
    ip_address = Column(String(45))
    user_agent = Column(Text)
    created_at = Column(DateTime, default=func.current_timestamp())

    # Связи
    user = relationship("User", back_populates="user_logs")

    def __repr__(self):
        return f"<UserLog(action='{self.action}', entity_type='{self.entity_type}')>"


class Alert(Base):
    """Модель уведомлений."""
    __tablename__ = "alerts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"))
    alert_type = Column(String(50), nullable=False)
    level = Column(SQLEnum(AlertLevel), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    is_resolved = Column(Boolean, default=False)
    resolved_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    resolved_at = Column(DateTime)
    created_at = Column(DateTime, default=func.current_timestamp())

    # Связи
    product = relationship("Product", back_populates="alerts")
    resolved_by_user = relationship("User", back_populates="resolved_alerts")

    def __repr__(self):
        return f"<Alert(type='{self.alert_type}', level='{self.level}')>"


class SyncHistory(Base):
    """Модель истории синхронизации."""
    __tablename__ = "sync_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sync_type = Column(String(50), nullable=False)
    status = Column(SQLEnum(SyncStatus), nullable=False)
    items_processed = Column(Integer, default=0)
    items_updated = Column(Integer, default=0)
    items_created = Column(Integer, default=0)
    items_failed = Column(Integer, default=0)
    error_message = Column(Text)
    details = Column(JSONB)
    started_at = Column(DateTime, nullable=False)
    completed_at = Column(DateTime)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))

    def __repr__(self):
        return f"<SyncHistory(type='{self.sync_type}', status='{self.status}')>"


class IntegrationConfig(Base, TimestampMixin):
    """Модель конфигурации интеграций."""
    __tablename__ = "integration_config"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    service_name = Column(String(50), unique=True, nullable=False)
    config_data = Column(JSONB, nullable=False)
    is_enabled = Column(Boolean, default=True)
    last_sync = Column(DateTime)

    def __repr__(self):
        return f"<IntegrationConfig(service='{self.service_name}', enabled={self.is_enabled})>"


# Индексы для оптимизации (совместимые с SQLAlchemy 2.0)
Index('idx_products_name_search', Product.name)
Index('idx_inventory_low_stock', Inventory.quantity, Inventory.min_quantity)
Index('idx_movements_date_type', InventoryMovement.created_at, InventoryMovement.movement_type)
Index('idx_orders_customer_date', Order.customer_email, Order.order_date)
Index('idx_sales_date_product', Sale.sale_date, Sale.product_id)
Index('idx_logs_user_date', UserLog.user_id, UserLog.created_at)
Index('idx_alerts_unread', Alert.is_read, Alert.level) 