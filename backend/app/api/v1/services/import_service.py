"""
Сервис для импорта данных из различных источников.
"""

import logging
import csv
import json
import pandas as pd
from typing import List, Dict, Any, Optional, Union, BinaryIO
from uuid import UUID
from datetime import datetime
from io import StringIO, BytesIO
from sqlalchemy.orm import Session
from fastapi import HTTPException, status, UploadFile

from backend.app.database.models import (
    Product as ProductModel,
    Category as CategoryModel,
    Supplier as SupplierModel,
    UserLog as UserLogModel
)
from backend.app.api.v1.schemas.import_data import (
    ImportResult, ImportStatus, ImportSource, ImportMapping,
    ProductImportData, CategoryImportData, SupplierImportData
)
from backend.app.api.v1.services.product_service import ProductService
from backend.app.api.v1.services.category_service import CategoryService

logger = logging.getLogger(__name__)


class ImportService:
    """Сервис для импорта данных."""
    
    def __init__(self, db: Session):
        self.db = db
        self.product_service = ProductService(db)
        self.category_service = CategoryService(db)
    
    def _log_import_action(self, user_id: UUID, action: str, details: Dict[str, Any]):
        """Логирование действий импорта."""
        log_entry = UserLogModel(
            user_id=user_id,
            action=action,
            details=details,
            ip_address="system",
            user_agent="ImportService"
        )
        self.db.add(log_entry)
    
    def _detect_file_format(self, file: UploadFile) -> str:
        """Определение формата файла."""
        filename = file.filename.lower()
        
        if filename.endswith('.csv'):
            return 'csv'
        elif filename.endswith(('.xlsx', '.xls')):
            return 'excel'
        elif filename.endswith('.json'):
            return 'json'
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Неподдерживаемый формат файла. Поддерживаются: CSV, Excel, JSON"
            )
    
    def _parse_csv_file(self, file_content: bytes, encoding: str = 'utf-8') -> List[Dict[str, Any]]:
        """Парсинг CSV файла."""
        try:
            content = file_content.decode(encoding)
            csv_reader = csv.DictReader(StringIO(content))
            return list(csv_reader)
        except UnicodeDecodeError:
            # Пробуем другие кодировки
            for enc in ['cp1251', 'latin1']:
                try:
                    content = file_content.decode(enc)
                    csv_reader = csv.DictReader(StringIO(content))
                    return list(csv_reader)
                except UnicodeDecodeError:
                    continue
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Не удалось определить кодировку файла"
            )
    
    def _parse_excel_file(self, file_content: bytes) -> List[Dict[str, Any]]:
        """Парсинг Excel файла."""
        try:
            df = pd.read_excel(BytesIO(file_content))
            # Заменяем NaN на None
            df = df.where(pd.notnull(df), None)
            return df.to_dict('records')
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ошибка чтения Excel файла: {str(e)}"
            )
    
    def _parse_json_file(self, file_content: bytes) -> List[Dict[str, Any]]:
        """Парсинг JSON файла."""
        try:
            content = file_content.decode('utf-8')
            data = json.loads(content)
            
            if isinstance(data, list):
                return data
            elif isinstance(data, dict):
                # Если это объект, ищем массив данных
                for key in ['data', 'items', 'products', 'records']:
                    if key in data and isinstance(data[key], list):
                        return data[key]
                # Если не найден массив, возвращаем как единственный элемент
                return [data]
            else:
                raise ValueError("Неподдерживаемая структура JSON")
                
        except (json.JSONDecodeError, ValueError) as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ошибка парсинга JSON: {str(e)}"
            )
    
    def _map_fields(self, data: Dict[str, Any], mapping: ImportMapping) -> Dict[str, Any]:
        """Маппинг полей согласно настройкам."""
        mapped_data = {}
        
        for target_field, source_field in mapping.field_mapping.items():
            if source_field in data:
                value = data[source_field]
                
                # Применяем трансформации
                if target_field in mapping.transformations:
                    transform = mapping.transformations[target_field]
                    if transform == 'upper':
                        value = str(value).upper() if value else value
                    elif transform == 'lower':
                        value = str(value).lower() if value else value
                    elif transform == 'strip':
                        value = str(value).strip() if value else value
                
                mapped_data[target_field] = value
        
        return mapped_data
    
    def _find_or_create_category(self, category_name: str) -> Optional[CategoryModel]:
        """Поиск или создание категории."""
        if not category_name:
            return None
        
        category = self.category_service.get_category_by_name(category_name)
        if not category:
            from backend.app.api.v1.schemas.category import CategoryCreate
            category_data = CategoryCreate(
                name=category_name,
                description=f"Автоматически создана при импорте"
            )
            category = self.category_service.create_category(category_data)
        
        return category
    
    def _find_or_create_supplier(self, supplier_name: str) -> Optional[SupplierModel]:
        """Поиск или создание поставщика."""
        if not supplier_name:
            return None
        
        supplier = self.db.query(SupplierModel).filter(
            SupplierModel.name == supplier_name
        ).first()
        
        if not supplier:
            supplier = SupplierModel(
                name=supplier_name,
                contact_person="Автоимпорт",
                email=f"import@{supplier_name.lower().replace(' ', '')}.com"
            )
            self.db.add(supplier)
            self.db.flush()
        
        return supplier
    
    async def import_products_from_file(
        self,
        file: UploadFile,
        user_id: UUID,
        mapping: Optional[ImportMapping] = None,
        update_existing: bool = False
    ) -> ImportResult:
        """Импорт товаров из файла."""
        start_time = datetime.utcnow()
        result = ImportResult(
            total_items=0,
            processed_items=0,
            created_items=0,
            updated_items=0,
            failed_items=0,
            errors=[],
            warnings=[]
        )
        
        try:
            # Читаем файл
            file_content = await file.read()
            file_format = self._detect_file_format(file)
            
            # Парсим данные
            if file_format == 'csv':
                raw_data = self._parse_csv_file(file_content)
            elif file_format == 'excel':
                raw_data = self._parse_excel_file(file_content)
            elif file_format == 'json':
                raw_data = self._parse_json_file(file_content)
            
            result.total_items = len(raw_data)
            
            # Логируем начало импорта
            self._log_import_action(user_id, "import_started", {
                "file_name": file.filename,
                "file_format": file_format,
                "total_items": result.total_items
            })
            
            # Обрабатываем каждую запись
            for i, raw_item in enumerate(raw_data):
                try:
                    # Применяем маппинг если есть
                    if mapping:
                        item_data = self._map_fields(raw_item, mapping)
                    else:
                        item_data = raw_item
                    
                    # Валидируем обязательные поля
                    if not item_data.get('name'):
                        result.failed_items += 1
                        result.errors.append(f"Строка {i+1}: отсутствует название товара")
                        continue
                    
                    if not item_data.get('sku'):
                        result.failed_items += 1
                        result.errors.append(f"Строка {i+1}: отсутствует артикул товара")
                        continue
                    
                    # Ищем существующий товар
                    existing_product = self.db.query(ProductModel).filter(
                        ProductModel.sku == item_data['sku']
                    ).first()
                    
                    if existing_product and not update_existing:
                        result.warnings.append(f"Товар с артикулом {item_data['sku']} уже существует")
                        continue
                    
                    # Обрабатываем категорию
                    category = None
                    if item_data.get('category'):
                        category = self._find_or_create_category(item_data['category'])
                    
                    # Обрабатываем поставщика
                    supplier = None
                    if item_data.get('supplier'):
                        supplier = self._find_or_create_supplier(item_data['supplier'])
                    
                    if existing_product and update_existing:
                        # Обновляем существующий товар
                        existing_product.name = item_data['name']
                        existing_product.description = item_data.get('description')
                        existing_product.unit_price = float(item_data.get('unit_price', 0))
                        existing_product.cost_price = float(item_data.get('cost_price', 0))
                        existing_product.unit_of_measure = item_data.get('unit_of_measure', 'шт')
                        existing_product.category_id = category.id if category else None
                        existing_product.supplier_id = supplier.id if supplier else None
                        
                        result.updated_items += 1
                    else:
                        # Создаем новый товар
                        from backend.app.api.v1.schemas.product import ProductCreate
                        product_data = ProductCreate(
                            name=item_data['name'],
                            sku=item_data['sku'],
                            description=item_data.get('description'),
                            unit_price=float(item_data.get('unit_price', 0)),
                            cost_price=float(item_data.get('cost_price', 0)),
                            unit_of_measure=item_data.get('unit_of_measure', 'шт'),
                            category_id=category.id if category else None,
                            supplier_id=supplier.id if supplier else None,
                            barcode=item_data.get('barcode'),
                            status=item_data.get('status', 'active')
                        )
                        
                        new_product = self.product_service.create_product(product_data)
                        result.created_items += 1
                    
                    result.processed_items += 1
                    
                    # Коммитим каждые 100 записей
                    if result.processed_items % 100 == 0:
                        self.db.commit()
                        logger.info(f"Обработано {result.processed_items} из {result.total_items} записей")
                
                except Exception as e:
                    result.failed_items += 1
                    error_msg = f"Строка {i+1}: {str(e)}"
                    result.errors.append(error_msg)
                    logger.error(error_msg)
            
            # Финальный коммит
            self.db.commit()
            
            # Логируем завершение импорта
            self._log_import_action(user_id, "import_completed", {
                "file_name": file.filename,
                "result": result.dict()
            })
            
            logger.info(f"Импорт завершен: {result.processed_items} обработано, "
                       f"{result.created_items} создано, {result.updated_items} обновлено, "
                       f"{result.failed_items} ошибок")
        
        except Exception as e:
            self.db.rollback()
            result.errors.append(f"Критическая ошибка импорта: {str(e)}")
            logger.error(f"Критическая ошибка импорта: {e}")
            
            # Логируем ошибку
            self._log_import_action(user_id, "import_failed", {
                "file_name": file.filename,
                "error": str(e)
            })
            
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Ошибка импорта: {str(e)}"
            )
        
        return result
    
    def export_products_to_csv(self, filters: Optional[Dict[str, Any]] = None) -> str:
        """Экспорт товаров в CSV."""
        query = self.db.query(ProductModel)
        
        # Применяем фильтры если есть
        if filters:
            if filters.get('category_id'):
                query = query.filter(ProductModel.category_id == filters['category_id'])
            if filters.get('supplier_id'):
                query = query.filter(ProductModel.supplier_id == filters['supplier_id'])
            if filters.get('status'):
                query = query.filter(ProductModel.status == filters['status'])
        
        products = query.all()
        
        # Создаем CSV
        output = StringIO()
        writer = csv.writer(output)
        
        # Заголовки
        headers = [
            'sku', 'name', 'description', 'unit_price', 'cost_price',
            'unit_of_measure', 'category', 'supplier', 'barcode', 'status'
        ]
        writer.writerow(headers)
        
        # Данные
        for product in products:
            row = [
                product.sku,
                product.name,
                product.description or '',
                product.unit_price,
                product.cost_price or 0,
                product.unit_of_measure,
                product.category.name if product.category else '',
                product.supplier.name if product.supplier else '',
                product.barcode or '',
                product.status
            ]
            writer.writerow(row)
        
        return output.getvalue()
    
    def get_import_template(self, entity_type: str = 'products') -> Dict[str, Any]:
        """Получение шаблона для импорта."""
        if entity_type == 'products':
            return {
                "required_fields": ["name", "sku"],
                "optional_fields": [
                    "description", "unit_price", "cost_price", "unit_of_measure",
                    "category", "supplier", "barcode", "status"
                ],
                "field_descriptions": {
                    "name": "Название товара",
                    "sku": "Артикул (уникальный)",
                    "description": "Описание товара",
                    "unit_price": "Цена продажи",
                    "cost_price": "Себестоимость",
                    "unit_of_measure": "Единица измерения (шт, кг, л и т.д.)",
                    "category": "Название категории",
                    "supplier": "Название поставщика",
                    "barcode": "Штрихкод",
                    "status": "Статус (active, inactive, discontinued)"
                },
                "example_data": [
                    {
                        "name": "Товар 1",
                        "sku": "SKU001",
                        "description": "Описание товара 1",
                        "unit_price": 100.00,
                        "cost_price": 80.00,
                        "unit_of_measure": "шт",
                        "category": "Категория 1",
                        "supplier": "Поставщик 1",
                        "barcode": "1234567890123",
                        "status": "active"
                    }
                ]
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Неподдерживаемый тип сущности"
            ) 