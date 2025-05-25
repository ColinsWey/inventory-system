"""
Эндпоинты для работы с категориями товаров.
"""

import logging
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.database.connection import get_db
from app.api.v1.services.category_service import CategoryService
from app.api.v1.schemas.category import (
    Category, CategoryCreate, CategoryUpdate, CategoryTree, CategoryListItem
)
from app.api.v1.schemas.common import SuccessResponse
from app.api.v1.dependencies import (
    get_current_active_user, require_operator, require_manager
)
from app.database.models import User as UserModel

logger = logging.getLogger(__name__)

router = APIRouter()


def get_category_service(db: Session = Depends(get_db)) -> CategoryService:
    """Получение сервиса категорий."""
    return CategoryService(db)


@router.get("", response_model=List[CategoryListItem], summary="Список категорий")
async def get_categories(
    include_inactive: bool = Query(False, description="Включать неактивные категории"),
    current_user: UserModel = Depends(get_current_active_user),
    category_service: CategoryService = Depends(get_category_service)
):
    """
    Получение списка всех категорий.
    
    Возвращает плоский список категорий с информацией о:
    - Основных данных категории
    - Количестве товаров в категории
    - Уровне вложенности
    
    По умолчанию возвращаются только активные категории.
    """
    categories = category_service.get_categories(include_inactive)
    
    # Преобразуем в схему ответа с подсчетом уровня вложенности
    items = []
    for category in categories:
        # Определяем уровень вложенности
        level = 0
        current_cat = category
        while current_cat.parent_id:
            level += 1
            current_cat = category_service.get_category_by_id(current_cat.parent_id)
            if not current_cat:
                break
        
        # Подсчитываем товары в категории
        from app.database.models import Product as ProductModel
        products_count = category_service.db.query(ProductModel).filter(
            ProductModel.category_id == category.id
        ).count()
        
        item = CategoryListItem(
            id=category.id,
            name=category.name,
            description=category.description,
            parent_id=category.parent_id,
            sort_order=category.sort_order,
            is_active=category.is_active,
            products_count=products_count,
            level=level,
            created_at=category.created_at,
            updated_at=category.updated_at
        )
        items.append(item)
    
    return items


@router.get("/tree", response_model=List[CategoryTree], summary="Дерево категорий")
async def get_category_tree(
    include_inactive: bool = Query(False, description="Включать неактивные категории"),
    current_user: UserModel = Depends(get_current_active_user),
    category_service: CategoryService = Depends(get_category_service)
):
    """
    Получение иерархического дерева категорий.
    
    Возвращает структуру дерева с вложенными подкатегориями.
    Удобно для отображения в виде дерева в интерфейсе.
    
    Каждая категория содержит:
    - Основную информацию
    - Количество товаров
    - Массив дочерних категорий
    """
    return category_service.get_category_tree(include_inactive)


@router.get("/{category_id}", response_model=Category, summary="Информация о категории")
async def get_category(
    category_id: UUID,
    current_user: UserModel = Depends(get_current_active_user),
    category_service: CategoryService = Depends(get_category_service)
):
    """
    Получение полной информации о категории по ID.
    
    Включает:
    - Основную информацию о категории
    - Дочерние категории
    - Количество товаров в категории
    """
    category = category_service.get_category_by_id(category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Категория не найдена"
        )
    
    # Подсчитываем товары в категории
    from app.database.models import Product as ProductModel
    products_count = category_service.db.query(ProductModel).filter(
        ProductModel.category_id == category_id
    ).count()
    
    return Category(
        id=category.id,
        name=category.name,
        description=category.description,
        parent_id=category.parent_id,
        sort_order=category.sort_order,
        is_active=category.is_active,
        children=[
            Category(
                id=child.id,
                name=child.name,
                description=child.description,
                parent_id=child.parent_id,
                sort_order=child.sort_order,
                is_active=child.is_active,
                children=[],
                products_count=0,
                created_at=child.created_at,
                updated_at=child.updated_at
            ) for child in category.children
        ],
        products_count=products_count,
        created_at=category.created_at,
        updated_at=category.updated_at
    )


@router.post("", response_model=Category, summary="Создание категории")
async def create_category(
    category_data: CategoryCreate,
    current_user: UserModel = Depends(require_operator),
    category_service: CategoryService = Depends(get_category_service)
):
    """
    Создание новой категории.
    
    Требуемые поля:
    - **name**: Уникальное название категории
    
    Опциональные поля:
    - **description**: Описание категории
    - **parent_id**: ID родительской категории (для создания подкатегории)
    - **sort_order**: Порядок сортировки (по умолчанию 0)
    - **is_active**: Активна ли категория (по умолчанию true)
    
    При указании parent_id проверяется:
    - Существование родительской категории
    - Отсутствие циклических зависимостей
    """
    category = category_service.create_category(category_data)
    
    # Возвращаем созданную категорию
    return await get_category(category.id, current_user, category_service)


@router.put("/{category_id}", response_model=Category, summary="Обновление категории")
async def update_category(
    category_id: UUID,
    category_data: CategoryUpdate,
    current_user: UserModel = Depends(require_operator),
    category_service: CategoryService = Depends(get_category_service)
):
    """
    Обновление существующей категории.
    
    Можно обновить любые поля категории.
    Все поля опциональны - обновляются только переданные поля.
    
    При изменении parent_id проверяется:
    - Существование новой родительской категории
    - Отсутствие циклических зависимостей
    - Уникальность названия (если изменяется)
    """
    category = category_service.update_category(category_id, category_data)
    
    # Возвращаем обновленную категорию
    return await get_category(category.id, current_user, category_service)


@router.delete("/{category_id}", response_model=SuccessResponse, summary="Удаление категории")
async def delete_category(
    category_id: UUID,
    current_user: UserModel = Depends(require_manager),
    category_service: CategoryService = Depends(get_category_service)
):
    """
    Удаление категории.
    
    Категорию можно удалить только если:
    - В ней нет товаров
    - У неё нет дочерних категорий
    
    Доступно только менеджерам и администраторам.
    """
    category_service.delete_category(category_id)
    
    return SuccessResponse(message="Категория успешно удалена")


@router.get("/{category_id}/path", response_model=List[Category], summary="Путь к категории")
async def get_category_path(
    category_id: UUID,
    current_user: UserModel = Depends(get_current_active_user),
    category_service: CategoryService = Depends(get_category_service)
):
    """
    Получение пути к категории от корня.
    
    Возвращает массив категорий от корневой до указанной.
    Полезно для отображения хлебных крошек в интерфейсе.
    
    Пример: [Электроника, Смартфоны, iPhone]
    """
    path = category_service.get_category_path(category_id)
    
    if not path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Категория не найдена"
        )
    
    # Преобразуем в схему ответа
    result = []
    for category in path:
        result.append(Category(
            id=category.id,
            name=category.name,
            description=category.description,
            parent_id=category.parent_id,
            sort_order=category.sort_order,
            is_active=category.is_active,
            children=[],
            products_count=0,
            created_at=category.created_at,
            updated_at=category.updated_at
        ))
    
    return result


@router.get("/{category_id}/descendants", response_model=List[Category], summary="Потомки категории")
async def get_category_descendants(
    category_id: UUID,
    current_user: UserModel = Depends(get_current_active_user),
    category_service: CategoryService = Depends(get_category_service)
):
    """
    Получение всех потомков категории.
    
    Возвращает плоский список всех дочерних категорий
    (включая подкатегории подкатегорий).
    
    Полезно для операций над всей веткой категорий.
    """
    # Проверяем существование категории
    category = category_service.get_category_by_id(category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Категория не найдена"
        )
    
    descendants = category_service.get_category_descendants(category_id)
    
    # Преобразуем в схему ответа
    result = []
    for category in descendants:
        result.append(Category(
            id=category.id,
            name=category.name,
            description=category.description,
            parent_id=category.parent_id,
            sort_order=category.sort_order,
            is_active=category.is_active,
            children=[],
            products_count=0,
            created_at=category.created_at,
            updated_at=category.updated_at
        ))
    
    return result 