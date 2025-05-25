"""
Схемы данных для SalesDrive API.
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel, Field, validator
from enum import Enum

from .common import UUIDMixin, TimestampMixin


class SalesDriveOrderStatus(str, Enum):
    """Статусы заказов в SalesDrive."""
    NEW = "new"
    CONFIRMED = "confirmed"
    PROCESSING = "processing"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    RETURNED = "returned"


class SalesDriveProductStatus(str, Enum):
    """Статусы товаров в SalesDrive."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    ARCHIVED = "archived"


class SalesDriveCategory(BaseModel):
    """Категория из SalesDrive."""
    id: str = Field(description="ID категории в SalesDrive")
    name: str = Field(description="Название категории")
    parent_id: Optional[str] = Field(None, description="ID родительской категории")
    description: Optional[str] = Field(None, description="Описание категории")
    sort_order: int = Field(default=0, description="Порядок сортировки")
    is_active: bool = Field(default=True, description="Активна ли категория")


class SalesDriveSupplier(BaseModel):
    """Поставщик из SalesDrive."""
    id: str = Field(description="ID поставщика в SalesDrive")
    name: str = Field(description="Название поставщика")
    code: Optional[str] = Field(None, description="Код поставщика")
    contact_person: Optional[str] = Field(None, description="Контактное лицо")
    email: Optional[str] = Field(None, description="Email")
    phone: Optional[str] = Field(None, description="Телефон")
    address: Optional[str] = Field(None, description="Адрес")
    is_active: bool = Field(default=True, description="Активен ли поставщик")


class SalesDriveProductBase(BaseModel):
    """Базовая модель товара из SalesDrive."""
    id: str = Field(description="ID товара в SalesDrive")
    name: str = Field(description="Название товара")
    sku: str = Field(description="Артикул товара")
    barcode: Optional[str] = Field(None, description="Штрихкод")
    description: Optional[str] = Field(None, description="Описание товара")
    category_id: Optional[str] = Field(None, description="ID категории")
    category_name: Optional[str] = Field(None, description="Название категории")
    supplier_id: Optional[str] = Field(None, description="ID поставщика")
    supplier_name: Optional[str] = Field(None, description="Название поставщика")
    unit_price: Decimal = Field(description="Цена за единицу")
    cost_price: Optional[Decimal] = Field(None, description="Себестоимость")
    unit_of_measure: str = Field(default="шт", description="Единица измерения")
    weight: Optional[Decimal] = Field(None, description="Вес в кг")
    status: SalesDriveProductStatus = Field(description="Статус товара")
    is_available: bool = Field(default=True, description="Доступен ли товар")
    created_at: datetime = Field(description="Дата создания в SalesDrive")
    updated_at: datetime = Field(description="Дата обновления в SalesDrive")


class SalesDriveProduct(SalesDriveProductBase):
    """Полная модель товара из SalesDrive."""
    category: Optional[SalesDriveCategory] = Field(None, description="Категория товара")
    supplier: Optional[SalesDriveSupplier] = Field(None, description="Поставщик товара")
    images: List[str] = Field(default=[], description="Ссылки на изображения")
    attributes: Dict[str, Any] = Field(default={}, description="Дополнительные атрибуты")
    inventory: Dict[str, Any] = Field(default={}, description="Информация об остатках")


class SalesDriveCustomer(BaseModel):
    """Клиент из SalesDrive."""
    id: str = Field(description="ID клиента в SalesDrive")
    name: str = Field(description="Имя клиента")
    email: Optional[str] = Field(None, description="Email клиента")
    phone: Optional[str] = Field(None, description="Телефон клиента")
    address: Optional[str] = Field(None, description="Адрес клиента")
    city: Optional[str] = Field(None, description="Город")
    region: Optional[str] = Field(None, description="Регион")
    postal_code: Optional[str] = Field(None, description="Почтовый индекс")
    country: Optional[str] = Field(None, description="Страна")
    created_at: datetime = Field(description="Дата регистрации")


class SalesDriveOrderItem(BaseModel):
    """Позиция заказа из SalesDrive."""
    id: str = Field(description="ID позиции")
    product_id: str = Field(description="ID товара")
    product_name: str = Field(description="Название товара")
    product_sku: str = Field(description="Артикул товара")
    quantity: int = Field(description="Количество")
    unit_price: Decimal = Field(description="Цена за единицу")
    total_price: Decimal = Field(description="Общая стоимость позиции")
    discount: Optional[Decimal] = Field(None, description="Скидка")
    tax_rate: Optional[Decimal] = Field(None, description="Налоговая ставка")


class SalesDriveOrderBase(BaseModel):
    """Базовая модель заказа из SalesDrive."""
    id: str = Field(description="ID заказа в SalesDrive")
    number: str = Field(description="Номер заказа")
    status: SalesDriveOrderStatus = Field(description="Статус заказа")
    customer_id: str = Field(description="ID клиента")
    customer_name: str = Field(description="Имя клиента")
    customer_email: Optional[str] = Field(None, description="Email клиента")
    customer_phone: Optional[str] = Field(None, description="Телефон клиента")
    total_amount: Decimal = Field(description="Общая сумма заказа")
    discount_amount: Optional[Decimal] = Field(None, description="Сумма скидки")
    tax_amount: Optional[Decimal] = Field(None, description="Сумма налога")
    shipping_amount: Optional[Decimal] = Field(None, description="Стоимость доставки")
    payment_method: Optional[str] = Field(None, description="Способ оплаты")
    delivery_method: Optional[str] = Field(None, description="Способ доставки")
    delivery_address: Optional[str] = Field(None, description="Адрес доставки")
    notes: Optional[str] = Field(None, description="Примечания к заказу")
    created_at: datetime = Field(description="Дата создания заказа")
    updated_at: datetime = Field(description="Дата обновления заказа")


class SalesDriveOrder(SalesDriveOrderBase):
    """Полная модель заказа из SalesDrive."""
    customer: Optional[SalesDriveCustomer] = Field(None, description="Информация о клиенте")
    items: List[SalesDriveOrderItem] = Field(default=[], description="Позиции заказа")
    history: List[Dict[str, Any]] = Field(default=[], description="История изменений")


class SalesDriveProductsResponse(BaseModel):
    """Ответ API со списком товаров."""
    data: List[SalesDriveProduct] = Field(description="Список товаров")
    pagination: Dict[str, Any] = Field(description="Информация о пагинации")
    total: int = Field(description="Общее количество товаров")
    page: int = Field(description="Текущая страница")
    per_page: int = Field(description="Количество на странице")
    has_more: bool = Field(description="Есть ли еще страницы")


class SalesDriveOrdersResponse(BaseModel):
    """Ответ API со списком заказов."""
    data: List[SalesDriveOrder] = Field(description="Список заказов")
    pagination: Dict[str, Any] = Field(description="Информация о пагинации")
    total: int = Field(description="Общее количество заказов")
    page: int = Field(description="Текущая страница")
    per_page: int = Field(description="Количество на странице")
    has_more: bool = Field(description="Есть ли еще страницы")


class SalesDriveCategoriesResponse(BaseModel):
    """Ответ API со списком категорий."""
    data: List[SalesDriveCategory] = Field(description="Список категорий")
    total: int = Field(description="Общее количество категорий")


class SalesDriveSuppliersResponse(BaseModel):
    """Ответ API со списком поставщиков."""
    data: List[SalesDriveSupplier] = Field(description="Список поставщиков")
    total: int = Field(description="Общее количество поставщиков")


class SalesDriveErrorResponse(BaseModel):
    """Ответ API с ошибкой."""
    error: str = Field(description="Код ошибки")
    message: str = Field(description="Описание ошибки")
    details: Optional[Dict[str, Any]] = Field(None, description="Дополнительные детали")


class SalesDriveSyncRequest(BaseModel):
    """Запрос на синхронизацию с SalesDrive."""
    sync_products: bool = Field(default=True, description="Синхронизировать товары")
    sync_orders: bool = Field(default=False, description="Синхронизировать заказы")
    sync_categories: bool = Field(default=True, description="Синхронизировать категории")
    sync_suppliers: bool = Field(default=True, description="Синхронизировать поставщиков")
    date_from: Optional[datetime] = Field(None, description="Дата начала для заказов")
    date_to: Optional[datetime] = Field(None, description="Дата окончания для заказов")
    full_sync: bool = Field(default=False, description="Полная синхронизация")
    auto_create_categories: bool = Field(default=True, description="Автоматически создавать категории")
    auto_create_suppliers: bool = Field(default=True, description="Автоматически создавать поставщиков")
    update_existing: bool = Field(default=True, description="Обновлять существующие записи")


class SalesDriveSyncResult(BaseModel):
    """Результат синхронизации с SalesDrive."""
    sync_id: UUID = Field(description="ID синхронизации")
    status: str = Field(description="Статус синхронизации")
    started_at: datetime = Field(description="Время начала")
    completed_at: Optional[datetime] = Field(None, description="Время завершения")
    products_result: Optional[Dict[str, Any]] = Field(None, description="Результат синхронизации товаров")
    orders_result: Optional[Dict[str, Any]] = Field(None, description="Результат синхронизации заказов")
    categories_result: Optional[Dict[str, Any]] = Field(None, description="Результат синхронизации категорий")
    suppliers_result: Optional[Dict[str, Any]] = Field(None, description="Результат синхронизации поставщиков")
    total_processed: int = Field(default=0, description="Всего обработано записей")
    total_created: int = Field(default=0, description="Всего создано записей")
    total_updated: int = Field(default=0, description="Всего обновлено записей")
    total_errors: int = Field(default=0, description="Всего ошибок")
    errors: List[str] = Field(default=[], description="Список ошибок")
    warnings: List[str] = Field(default=[], description="Список предупреждений")


class SalesDriveConnectionTest(BaseModel):
    """Результат тестирования соединения с SalesDrive."""
    success: bool = Field(description="Успешно ли соединение")
    message: str = Field(description="Сообщение о результате")
    api_version: Optional[str] = Field(None, description="Версия API")
    account_info: Optional[Dict[str, Any]] = Field(None, description="Информация об аккаунте")
    response_time: Optional[float] = Field(None, description="Время ответа в секундах")


class SalesDriveWebhookEvent(BaseModel):
    """Событие webhook от SalesDrive."""
    event_type: str = Field(description="Тип события")
    event_id: str = Field(description="ID события")
    timestamp: datetime = Field(description="Время события")
    data: Dict[str, Any] = Field(description="Данные события")
    signature: Optional[str] = Field(None, description="Подпись для проверки")


class SalesDriveInventoryUpdate(BaseModel):
    """Обновление остатков в SalesDrive."""
    product_id: str = Field(description="ID товара в SalesDrive")
    sku: str = Field(description="Артикул товара")
    quantity: int = Field(description="Новое количество")
    location: Optional[str] = Field(None, description="Локация склада")
    reason: Optional[str] = Field(None, description="Причина изменения")


class SalesDrivePriceUpdate(BaseModel):
    """Обновление цен в SalesDrive."""
    product_id: str = Field(description="ID товара в SalesDrive")
    sku: str = Field(description="Артикул товара")
    unit_price: Decimal = Field(description="Новая цена")
    cost_price: Optional[Decimal] = Field(None, description="Новая себестоимость")
    effective_date: Optional[datetime] = Field(None, description="Дата вступления в силу")


class SalesDriveProductCreate(BaseModel):
    """Создание товара в SalesDrive."""
    name: str = Field(description="Название товара")
    sku: str = Field(description="Артикул товара")
    barcode: Optional[str] = Field(None, description="Штрихкод")
    description: Optional[str] = Field(None, description="Описание товара")
    category_id: Optional[str] = Field(None, description="ID категории")
    supplier_id: Optional[str] = Field(None, description="ID поставщика")
    unit_price: Decimal = Field(description="Цена за единицу")
    cost_price: Optional[Decimal] = Field(None, description="Себестоимость")
    unit_of_measure: str = Field(default="шт", description="Единица измерения")
    weight: Optional[Decimal] = Field(None, description="Вес в кг")
    status: SalesDriveProductStatus = Field(default=SalesDriveProductStatus.ACTIVE)
    attributes: Optional[Dict[str, Any]] = Field(None, description="Дополнительные атрибуты")


class SalesDriveProductUpdate(BaseModel):
    """Обновление товара в SalesDrive."""
    name: Optional[str] = Field(None, description="Название товара")
    barcode: Optional[str] = Field(None, description="Штрихкод")
    description: Optional[str] = Field(None, description="Описание товара")
    category_id: Optional[str] = Field(None, description="ID категории")
    supplier_id: Optional[str] = Field(None, description="ID поставщика")
    unit_price: Optional[Decimal] = Field(None, description="Цена за единицу")
    cost_price: Optional[Decimal] = Field(None, description="Себестоимость")
    unit_of_measure: Optional[str] = Field(None, description="Единица измерения")
    weight: Optional[Decimal] = Field(None, description="Вес в кг")
    status: Optional[SalesDriveProductStatus] = Field(None, description="Статус товара")
    attributes: Optional[Dict[str, Any]] = Field(None, description="Дополнительные атрибуты")


class SalesDriveApiConfig(BaseModel):
    """Конфигурация SalesDrive API."""
    api_url: str = Field(description="URL API SalesDrive")
    api_key: str = Field(description="API ключ")
    timeout: int = Field(default=30, description="Таймаут запросов в секундах")
    max_retries: int = Field(default=3, description="Максимальное количество повторов")
    rate_limit_delay: float = Field(default=1.0, description="Задержка между запросами")
    auto_sync_enabled: bool = Field(default=False, description="Автоматическая синхронизация")
    sync_interval_minutes: int = Field(default=60, description="Интервал синхронизации в минутах")
    webhook_secret: Optional[str] = Field(None, description="Секрет для webhook")
    
    @validator('api_url')
    def validate_api_url(cls, v):
        if not v.startswith(('http://', 'https://')):
            raise ValueError('API URL должен начинаться с http:// или https://')
        return v.rstrip('/')
    
    @validator('api_key')
    def validate_api_key(cls, v):
        if len(v) < 10:
            raise ValueError('API ключ слишком короткий')
        return v 