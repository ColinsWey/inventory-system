"""
Эндпоинты для работы с товарами.
"""

import logging
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.database.connection import get_db
from app.api.v1.services.product_service import ProductService
from app.api.v1.schemas.product import (
    Product, ProductCreate, ProductUpdate, ProductListItem, 
    ProductFilters, ProductBulkUpdate
)
from app.api.v1.schemas.common import (
    PaginationParams, PaginatedResponse, SuccessResponse
)
from app.api.v1.dependencies import (
    get_current_active_user, require_operator, require_manager
)
from app.database.models import User as UserModel

logger = logging.getLogger(__name__)

router = APIRouter()


def get_product_service(db: Session = Depends(get_db)) -> ProductService:
    """Получение сервиса товаров."""
    return ProductService(db)


@router.get("", response_model=PaginatedResponse, summary="Список товаров")
async def get_products(
    # Параметры пагинации
    page: int = Query(1, ge=1, description="Номер страницы"),
    size: int = Query(20, ge=1, le=100, description="Размер страницы"),
    
    # Параметры фильтрации
    search: str = Query(None, description="Поиск по названию, артикулу или описанию"),
    category_id: UUID = Query(None, description="Фильтр по категории"),
    supplier_id: UUID = Query(None, description="Фильтр по поставщику"),
    status: str = Query(None, description="Фильтр по статусу"),
    stock_status: str = Query(None, description="Фильтр по статусу остатков"),
    min_price: float = Query(None, ge=0, description="Минимальная цена"),
    max_price: float = Query(None, ge=0, description="Максимальная цена"),
    low_stock: bool = Query(None, description="Только товары с низким остатком"),
    out_of_stock: bool = Query(None, description="Только товары без остатков"),
    
    # Параметры сортировки
    sort_by: str = Query("created_at", description="Поле для сортировки"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$", description="Порядок сортировки"),
    
    # Зависимости
    current_user: UserModel = Depends(get_current_active_user),
    product_service: ProductService = Depends(get_product_service)
):
    """
    Получение списка товаров с фильтрацией и пагинацией.
    
    Поддерживаемые фильтры:
    - **search**: Поиск по названию, артикулу или описанию
    - **category_id**: Фильтр по категории
    - **supplier_id**: Фильтр по поставщику
    - **status**: Фильтр по статусу (active, inactive, discontinued)
    - **stock_status**: Фильтр по статусу остатков
    - **min_price/max_price**: Фильтр по цене
    - **low_stock**: Только товары с низким остатком
    - **out_of_stock**: Только товары без остатков
    
    Поддерживаемые поля для сортировки:
    - name, sku, unit_price, created_at, updated_at
    """
    pagination = PaginationParams(page=page, size=size)
    filters = ProductFilters(
        search=search,
        category_id=category_id,
        supplier_id=supplier_id,
        status=status,
        stock_status=stock_status,
        min_price=min_price,
        max_price=max_price,
        low_stock=low_stock,
        out_of_stock=out_of_stock,
        sort_by=sort_by,
        sort_order=sort_order
    )
    
    products, total = product_service.get_products(pagination, filters)
    
    # Преобразуем в схему ответа
    items = []
    for product in products:
        # Подсчитываем общее количество на складах
        total_quantity = sum(inv.quantity for inv in product.inventory_records)
        
        # Определяем общий статус остатков
        stock_status = "out_of_stock"
        if total_quantity > 0:
            min_quantities = [inv.min_quantity for inv in product.inventory_records]
            if min_quantities and total_quantity <= min(min_quantities):
                stock_status = "low_stock"
            else:
                stock_status = "in_stock"
        
        item = ProductListItem(
            id=product.id,
            name=product.name,
            sku=product.sku,
            unit_price=product.unit_price,
            status=product.status,
            category={
                "id": product.category.id,
                "name": product.category.name,
                "description": product.category.description,
                "parent_id": product.category.parent_id
            } if product.category else None,
            supplier={
                "id": product.supplier.id,
                "name": product.supplier.name,
                "code": product.supplier.code,
                "contact_person": product.supplier.contact_person,
                "email": product.supplier.email,
                "phone": product.supplier.phone,
                "rating": product.supplier.rating
            } if product.supplier else None,
            tags=[{
                "id": tag.id,
                "name": tag.name,
                "color": tag.color,
                "description": tag.description
            } for tag in product.tags],
            total_quantity=total_quantity,
            stock_status=stock_status,
            created_at=product.created_at,
            updated_at=product.updated_at
        )
        items.append(item)
    
    return PaginatedResponse.create(items, total, page, size)


@router.get("/{product_id}", response_model=Product, summary="Карточка товара")
async def get_product(
    product_id: UUID,
    current_user: UserModel = Depends(get_current_active_user),
    product_service: ProductService = Depends(get_product_service)
):
    """
    Получение полной информации о товаре по ID.
    
    Включает:
    - Основную информацию о товаре
    - Категорию и поставщика
    - Теги товара
    - Остатки по всем локациям
    """
    product = product_service.get_product_by_id(product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Товар не найден"
        )
    
    # Формируем полный ответ
    return Product(
        id=product.id,
        name=product.name,
        sku=product.sku,
        barcode=product.barcode,
        category_id=product.category_id,
        supplier_id=product.supplier_id,
        description=product.description,
        specifications=product.specifications,
        unit_price=product.unit_price,
        cost_price=product.cost_price,
        weight=product.weight,
        dimensions=product.dimensions,
        unit_of_measure=product.unit_of_measure,
        status=product.status,
        is_serialized=product.is_serialized,
        warranty_months=product.warranty_months,
        category={
            "id": product.category.id,
            "name": product.category.name,
            "description": product.category.description,
            "parent_id": product.category.parent_id
        } if product.category else None,
        supplier={
            "id": product.supplier.id,
            "name": product.supplier.name,
            "code": product.supplier.code,
            "contact_person": product.supplier.contact_person,
            "email": product.supplier.email,
            "phone": product.supplier.phone,
            "rating": product.supplier.rating
        } if product.supplier else None,
        tags=[{
            "id": tag.id,
            "name": tag.name,
            "color": tag.color,
            "description": tag.description
        } for tag in product.tags],
        inventory=[{
            "location": inv.location,
            "quantity": inv.quantity,
            "reserved_quantity": inv.reserved_quantity,
            "min_quantity": inv.min_quantity,
            "max_quantity": inv.max_quantity,
            "reorder_point": inv.reorder_point,
            "stock_status": inv.stock_status
        } for inv in product.inventory_records],
        created_at=product.created_at,
        updated_at=product.updated_at
    )


@router.post("", response_model=Product, summary="Создание товара")
async def create_product(
    product_data: ProductCreate,
    current_user: UserModel = Depends(require_operator),
    product_service: ProductService = Depends(get_product_service)
):
    """
    Создание нового товара.
    
    Требуемые поля:
    - **name**: Название товара
    - **sku**: Уникальный артикул
    - **unit_price**: Цена за единицу
    
    Опциональные поля:
    - **category_id**: ID категории
    - **supplier_id**: ID поставщика
    - **tag_ids**: Список ID тегов
    - **description**: Описание товара
    - **specifications**: Технические характеристики (JSON)
    - И другие поля согласно схеме
    
    При создании товара автоматически создается запись в таблице остатков.
    """
    product = product_service.create_product(product_data, current_user.id)
    
    # Возвращаем созданный товар
    return await get_product(product.id, current_user, product_service)


@router.put("/{product_id}", response_model=Product, summary="Обновление товара")
async def update_product(
    product_id: UUID,
    product_data: ProductUpdate,
    current_user: UserModel = Depends(require_operator),
    product_service: ProductService = Depends(get_product_service)
):
    """
    Обновление существующего товара.
    
    Можно обновить любые поля товара, кроме SKU.
    Все поля опциональны - обновляются только переданные поля.
    
    Изменения логируются в таблице user_logs.
    """
    product = product_service.update_product(product_id, product_data, current_user.id)
    
    # Возвращаем обновленный товар
    return await get_product(product.id, current_user, product_service)


@router.delete("/{product_id}", response_model=SuccessResponse, summary="Удаление товара")
async def delete_product(
    product_id: UUID,
    current_user: UserModel = Depends(require_manager),
    product_service: ProductService = Depends(get_product_service)
):
    """
    Удаление товара.
    
    Товар можно удалить только если:
    - У него нет остатков на складах
    - Нет связанных заказов или движений
    
    Доступно только менеджерам и администраторам.
    """
    product_service.delete_product(product_id, current_user.id)
    
    return SuccessResponse(message="Товар успешно удален")


@router.post("/bulk-update", response_model=List[Product], summary="Массовое обновление товаров")
async def bulk_update_products(
    bulk_data: ProductBulkUpdate,
    current_user: UserModel = Depends(require_operator),
    product_service: ProductService = Depends(get_product_service)
):
    """
    Массовое обновление товаров.
    
    Позволяет одновременно обновить несколько товаров одинаковыми данными.
    Полезно для:
    - Изменения статуса группы товаров
    - Массового изменения цен
    - Назначения категории или поставщика
    - Добавления тегов
    
    Все изменения логируются отдельно для каждого товара.
    """
    products = product_service.bulk_update_products(bulk_data, current_user.id)
    
    # Возвращаем обновленные товары
    result = []
    for product in products:
        product_detail = await get_product(product.id, current_user, product_service)
        result.append(product_detail)
    
    return result 