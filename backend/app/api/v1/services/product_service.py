"""
Сервис для работы с товарами.
"""

import logging
from typing import List, Optional, Tuple
from uuid import UUID
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func, desc, asc
from fastapi import HTTPException, status

from backend.app.database.models import (
    Product as ProductModel, 
    Category as CategoryModel,
    Supplier as SupplierModel,
    ProductTag as ProductTagModel,
    ProductTagRelation,
    Inventory as InventoryModel,
    UserLog as UserLogModel
)
from backend.app.api.v1.schemas.product import (
    ProductCreate, ProductUpdate, ProductFilters, Product, 
    ProductListItem, ProductBulkUpdate
)
from backend.app.api.v1.schemas.common import PaginationParams

logger = logging.getLogger(__name__)


class ProductService:
    """Сервис для работы с товарами."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_products(
        self, 
        pagination: PaginationParams,
        filters: ProductFilters
    ) -> Tuple[List[ProductModel], int]:
        """Получение списка товаров с фильтрацией и пагинацией."""
        query = self.db.query(ProductModel).options(
            joinedload(ProductModel.category),
            joinedload(ProductModel.supplier),
            joinedload(ProductModel.tags),
            joinedload(ProductModel.inventory_records)
        )
        
        # Применяем фильтры
        if filters.search:
            search_term = f"%{filters.search}%"
            query = query.filter(
                or_(
                    ProductModel.name.ilike(search_term),
                    ProductModel.sku.ilike(search_term),
                    ProductModel.description.ilike(search_term)
                )
            )
        
        if filters.category_id:
            query = query.filter(ProductModel.category_id == filters.category_id)
        
        if filters.supplier_id:
            query = query.filter(ProductModel.supplier_id == filters.supplier_id)
        
        if filters.status:
            query = query.filter(ProductModel.status == filters.status)
        
        if filters.min_price is not None:
            query = query.filter(ProductModel.unit_price >= filters.min_price)
        
        if filters.max_price is not None:
            query = query.filter(ProductModel.unit_price <= filters.max_price)
        
        if filters.tag_ids:
            query = query.join(ProductTagRelation).filter(
                ProductTagRelation.tag_id.in_(filters.tag_ids)
            )
        
        # Фильтры по остаткам
        if filters.stock_status or filters.low_stock or filters.out_of_stock:
            query = query.join(InventoryModel)
            
            if filters.stock_status:
                query = query.filter(InventoryModel.stock_status == filters.stock_status)
            
            if filters.low_stock:
                query = query.filter(
                    InventoryModel.quantity <= InventoryModel.min_quantity
                )
            
            if filters.out_of_stock:
                query = query.filter(InventoryModel.quantity == 0)
        
        # Подсчет общего количества
        total = query.count()
        
        # Сортировка
        if filters.sort_by:
            sort_column = getattr(ProductModel, filters.sort_by, None)
            if sort_column:
                if filters.sort_order == "desc":
                    query = query.order_by(desc(sort_column))
                else:
                    query = query.order_by(asc(sort_column))
        
        # Пагинация
        products = query.offset(pagination.offset).limit(pagination.size).all()
        
        return products, total
    
    def get_product_by_id(self, product_id: UUID) -> Optional[ProductModel]:
        """Получение товара по ID."""
        return self.db.query(ProductModel).options(
            joinedload(ProductModel.category),
            joinedload(ProductModel.supplier),
            joinedload(ProductModel.tags),
            joinedload(ProductModel.inventory_records)
        ).filter(ProductModel.id == product_id).first()
    
    def get_product_by_sku(self, sku: str) -> Optional[ProductModel]:
        """Получение товара по SKU."""
        return self.db.query(ProductModel).filter(ProductModel.sku == sku).first()
    
    def create_product(self, product_data: ProductCreate, user_id: UUID) -> ProductModel:
        """Создание нового товара."""
        # Проверяем уникальность SKU
        if self.get_product_by_sku(product_data.sku):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Товар с артикулом {product_data.sku} уже существует"
            )
        
        # Проверяем существование категории
        if product_data.category_id:
            category = self.db.query(CategoryModel).filter(
                CategoryModel.id == product_data.category_id
            ).first()
            if not category:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Категория не найдена"
                )
        
        # Проверяем существование поставщика
        if product_data.supplier_id:
            supplier = self.db.query(SupplierModel).filter(
                SupplierModel.id == product_data.supplier_id
            ).first()
            if not supplier:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Поставщик не найден"
                )
        
        # Создаем товар
        product_dict = product_data.dict(exclude={'tag_ids'})
        db_product = ProductModel(**product_dict)
        
        self.db.add(db_product)
        self.db.flush()  # Получаем ID товара
        
        # Добавляем теги
        if product_data.tag_ids:
            self._add_product_tags(db_product.id, product_data.tag_ids)
        
        self.db.commit()
        self.db.refresh(db_product)
        
        # Логируем создание
        self._log_product_action(user_id, "CREATE", db_product.id, None, product_dict)
        
        logger.info(f"Создан товар: {db_product.sku} - {db_product.name}")
        return db_product
    
    def update_product(
        self, 
        product_id: UUID, 
        product_data: ProductUpdate, 
        user_id: UUID
    ) -> ProductModel:
        """Обновление товара."""
        product = self.get_product_by_id(product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Товар не найден"
            )
        
        # Сохраняем старые значения для логирования
        old_values = {
            "name": product.name,
            "unit_price": float(product.unit_price),
            "status": product.status.value,
            "category_id": str(product.category_id) if product.category_id else None,
            "supplier_id": str(product.supplier_id) if product.supplier_id else None
        }
        
        # Проверяем категорию
        if product_data.category_id:
            category = self.db.query(CategoryModel).filter(
                CategoryModel.id == product_data.category_id
            ).first()
            if not category:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Категория не найдена"
                )
        
        # Проверяем поставщика
        if product_data.supplier_id:
            supplier = self.db.query(SupplierModel).filter(
                SupplierModel.id == product_data.supplier_id
            ).first()
            if not supplier:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Поставщик не найден"
                )
        
        # Обновляем поля товара
        update_data = product_data.dict(exclude_unset=True, exclude={'tag_ids'})
        for field, value in update_data.items():
            setattr(product, field, value)
        
        # Обновляем теги
        if product_data.tag_ids is not None:
            self._update_product_tags(product_id, product_data.tag_ids)
        
        self.db.commit()
        self.db.refresh(product)
        
        # Логируем изменения
        new_values = {
            "name": product.name,
            "unit_price": float(product.unit_price),
            "status": product.status.value,
            "category_id": str(product.category_id) if product.category_id else None,
            "supplier_id": str(product.supplier_id) if product.supplier_id else None
        }
        self._log_product_action(user_id, "UPDATE", product_id, old_values, new_values)
        
        logger.info(f"Обновлен товар: {product.sku} - {product.name}")
        return product
    
    def delete_product(self, product_id: UUID, user_id: UUID) -> bool:
        """Удаление товара."""
        product = self.get_product_by_id(product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Товар не найден"
            )
        
        # Проверяем, есть ли остатки товара
        inventory = self.db.query(InventoryModel).filter(
            InventoryModel.product_id == product_id,
            InventoryModel.quantity > 0
        ).first()
        
        if inventory:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Нельзя удалить товар с остатками на складе"
            )
        
        # Сохраняем данные для логирования
        old_values = {
            "name": product.name,
            "sku": product.sku,
            "unit_price": float(product.unit_price),
            "status": product.status.value
        }
        
        # Удаляем товар
        self.db.delete(product)
        self.db.commit()
        
        # Логируем удаление
        self._log_product_action(user_id, "DELETE", product_id, old_values, None)
        
        logger.info(f"Удален товар: {product.sku} - {product.name}")
        return True
    
    def bulk_update_products(
        self, 
        bulk_data: ProductBulkUpdate, 
        user_id: UUID
    ) -> List[ProductModel]:
        """Массовое обновление товаров."""
        products = self.db.query(ProductModel).filter(
            ProductModel.id.in_(bulk_data.product_ids)
        ).all()
        
        if len(products) != len(bulk_data.product_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Некоторые товары не найдены"
            )
        
        updated_products = []
        update_data = bulk_data.updates.dict(exclude_unset=True, exclude={'tag_ids'})
        
        for product in products:
            # Сохраняем старые значения
            old_values = {field: getattr(product, field) for field in update_data.keys()}
            
            # Обновляем поля
            for field, value in update_data.items():
                setattr(product, field, value)
            
            # Обновляем теги если указаны
            if bulk_data.updates.tag_ids is not None:
                self._update_product_tags(product.id, bulk_data.updates.tag_ids)
            
            updated_products.append(product)
            
            # Логируем изменения
            new_values = {field: getattr(product, field) for field in update_data.keys()}
            self._log_product_action(user_id, "BULK_UPDATE", product.id, old_values, new_values)
        
        self.db.commit()
        
        logger.info(f"Массово обновлено товаров: {len(updated_products)}")
        return updated_products
    
    def _add_product_tags(self, product_id: UUID, tag_ids: List[UUID]) -> None:
        """Добавление тегов к товару."""
        # Проверяем существование тегов
        existing_tags = self.db.query(ProductTagModel).filter(
            ProductTagModel.id.in_(tag_ids)
        ).all()
        
        if len(existing_tags) != len(tag_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Некоторые теги не найдены"
            )
        
        # Добавляем связи
        for tag_id in tag_ids:
            relation = ProductTagRelation(product_id=product_id, tag_id=tag_id)
            self.db.add(relation)
    
    def _update_product_tags(self, product_id: UUID, tag_ids: List[UUID]) -> None:
        """Обновление тегов товара."""
        # Удаляем существующие связи
        self.db.query(ProductTagRelation).filter(
            ProductTagRelation.product_id == product_id
        ).delete()
        
        # Добавляем новые связи
        if tag_ids:
            self._add_product_tags(product_id, tag_ids)
    
    def _log_product_action(
        self, 
        user_id: UUID, 
        action: str, 
        product_id: UUID, 
        old_values: dict = None, 
        new_values: dict = None
    ) -> None:
        """Логирование действий с товарами."""
        log_entry = UserLogModel(
            user_id=user_id,
            action=action,
            entity_type="product",
            entity_id=product_id,
            old_values=old_values,
            new_values=new_values
        )
        self.db.add(log_entry) 