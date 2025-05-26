"""
Сервис для работы с категориями товаров.
"""

import logging
from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from fastapi import HTTPException, status

from app.database.models import Category as CategoryModel, Product as ProductModel
from app.api.v1.schemas.category import CategoryCreate, CategoryUpdate, Category, CategoryTree

logger = logging.getLogger(__name__)


class CategoryService:
    """Сервис для работы с категориями."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_categories(self, include_inactive: bool = False) -> List[CategoryModel]:
        """Получение списка всех категорий."""
        query = self.db.query(CategoryModel).options(
            joinedload(CategoryModel.children)
        )
        
        if not include_inactive:
            query = query.filter(CategoryModel.is_active == True)
        
        return query.order_by(CategoryModel.sort_order, CategoryModel.name).all()
    
    def get_category_tree(self, include_inactive: bool = False) -> List[CategoryTree]:
        """Получение дерева категорий."""
        # Получаем все категории
        categories = self.get_categories(include_inactive)
        
        # Создаем словарь для быстрого поиска
        category_dict = {cat.id: cat for cat in categories}
        
        # Подсчитываем количество товаров в каждой категории
        product_counts = dict(
            self.db.query(
                ProductModel.category_id,
                func.count(ProductModel.id)
            ).group_by(ProductModel.category_id).all()
        )
        
        # Строим дерево
        def build_tree(parent_id: Optional[UUID] = None) -> List[CategoryTree]:
            tree = []
            for category in categories:
                if category.parent_id == parent_id:
                    children = build_tree(category.id)
                    
                    tree_item = CategoryTree(
                        id=category.id,
                        name=category.name,
                        description=category.description,
                        sort_order=category.sort_order,
                        is_active=category.is_active,
                        products_count=product_counts.get(category.id, 0),
                        children=children
                    )
                    tree.append(tree_item)
            
            return sorted(tree, key=lambda x: (x.sort_order, x.name))
        
        return build_tree()
    
    def get_category_by_id(self, category_id: UUID) -> Optional[CategoryModel]:
        """Получение категории по ID."""
        return self.db.query(CategoryModel).options(
            joinedload(CategoryModel.children),
            joinedload(CategoryModel.parent)
        ).filter(CategoryModel.id == category_id).first()
    
    def get_category_by_name(self, name: str) -> Optional[CategoryModel]:
        """Получение категории по названию."""
        return self.db.query(CategoryModel).filter(CategoryModel.name == name).first()
    
    def create_category(self, category_data: CategoryCreate) -> CategoryModel:
        """Создание новой категории."""
        # Проверяем уникальность названия
        if self.get_category_by_name(category_data.name):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Категория с названием '{category_data.name}' уже существует"
            )
        
        # Проверяем существование родительской категории
        if category_data.parent_id:
            parent = self.get_category_by_id(category_data.parent_id)
            if not parent:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Родительская категория не найдена"
                )
            
            # Проверяем, что не создаем циклическую зависимость
            if self._would_create_cycle(category_data.parent_id, None):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Нельзя создать циклическую зависимость категорий"
                )
        
        # Создаем категорию
        db_category = CategoryModel(**category_data.dict())
        self.db.add(db_category)
        self.db.commit()
        self.db.refresh(db_category)
        
        logger.info(f"Создана категория: {db_category.name}")
        return db_category
    
    def update_category(self, category_id: UUID, category_data: CategoryUpdate) -> CategoryModel:
        """Обновление категории."""
        category = self.get_category_by_id(category_id)
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Категория не найдена"
            )
        
        # Проверяем уникальность названия при изменении
        if category_data.name and category_data.name != category.name:
            if self.get_category_by_name(category_data.name):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Категория с названием '{category_data.name}' уже существует"
                )
        
        # Проверяем родительскую категорию при изменении
        if category_data.parent_id is not None and category_data.parent_id != category.parent_id:
            if category_data.parent_id:
                parent = self.get_category_by_id(category_data.parent_id)
                if not parent:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Родительская категория не найдена"
                    )
                
                # Проверяем циклические зависимости
                if self._would_create_cycle(category_data.parent_id, category_id):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Нельзя создать циклическую зависимость категорий"
                    )
        
        # Обновляем поля
        update_data = category_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(category, field, value)
        
        self.db.commit()
        self.db.refresh(category)
        
        logger.info(f"Обновлена категория: {category.name}")
        return category
    
    def delete_category(self, category_id: UUID) -> bool:
        """Удаление категории."""
        category = self.get_category_by_id(category_id)
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Категория не найдена"
            )
        
        # Проверяем, есть ли товары в категории
        products_count = self.db.query(ProductModel).filter(
            ProductModel.category_id == category_id
        ).count()
        
        if products_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Нельзя удалить категорию с товарами ({products_count} шт.)"
            )
        
        # Проверяем, есть ли дочерние категории
        children_count = self.db.query(CategoryModel).filter(
            CategoryModel.parent_id == category_id
        ).count()
        
        if children_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Нельзя удалить категорию с подкатегориями ({children_count} шт.)"
            )
        
        # Удаляем категорию
        self.db.delete(category)
        self.db.commit()
        
        logger.info(f"Удалена категория: {category.name}")
        return True
    
    def get_category_path(self, category_id: UUID) -> List[CategoryModel]:
        """Получение пути к категории (от корня до текущей)."""
        path = []
        current_category = self.get_category_by_id(category_id)
        
        while current_category:
            path.insert(0, current_category)
            if current_category.parent_id:
                current_category = self.get_category_by_id(current_category.parent_id)
            else:
                break
        
        return path
    
    def get_category_descendants(self, category_id: UUID) -> List[CategoryModel]:
        """Получение всех потомков категории."""
        descendants = []
        
        def collect_descendants(parent_id: UUID):
            children = self.db.query(CategoryModel).filter(
                CategoryModel.parent_id == parent_id
            ).all()
            
            for child in children:
                descendants.append(child)
                collect_descendants(child.id)
        
        collect_descendants(category_id)
        return descendants
    
    def _would_create_cycle(self, new_parent_id: UUID, category_id: Optional[UUID]) -> bool:
        """Проверка, создаст ли изменение родителя циклическую зависимость."""
        if not category_id:
            return False
        
        # Проверяем, не является ли новый родитель потомком текущей категории
        descendants = self.get_category_descendants(category_id)
        descendant_ids = [desc.id for desc in descendants]
        
        return new_parent_id in descendant_ids or new_parent_id == category_id 