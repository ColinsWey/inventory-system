"""
Сервис интеграции с SalesDrive API.
"""

import logging
import asyncio
import time
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from uuid import UUID

import httpx
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from backend.app.core.config import settings
from backend.app.api.v1.schemas.import_data import (
    SalesDriveProduct, SalesDriveConfig, ImportStatus, ImportResult,
    SyncStatus, ImportSource
)
from backend.app.database.models import (
    Product as ProductModel, Category as CategoryModel,
    Supplier as SupplierModel, SyncHistory as SyncHistoryModel
)

logger = logging.getLogger(__name__)


class SalesDriveAPIError(Exception):
    """Базовое исключение для ошибок SalesDrive API."""
    pass


class SalesDriveRateLimitError(SalesDriveAPIError):
    """Исключение для превышения лимитов API."""
    pass


class SalesDriveAuthError(SalesDriveAPIError):
    """Исключение для ошибок авторизации."""
    pass


class SalesDriveClient:
    """Клиент для работы с SalesDrive API."""
    
    def __init__(self, config: SalesDriveConfig):
        self.config = config
        self.base_url = config.api_url.rstrip('/')
        self.api_key = config.api_key
        self.timeout = config.timeout
        
        # Настройки для retry и rate limiting
        self.max_retries = 3
        self.rate_limit_delay = 1.0
        self.last_request_time = 0
        
        # HTTP клиент с настройками
        self.client = httpx.AsyncClient(
            timeout=httpx.Timeout(self.timeout),
            headers={
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'InventorySystem/1.0'
            }
        )
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()
    
    async def _rate_limit(self):
        """Контроль частоты запросов."""
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        
        if time_since_last < self.rate_limit_delay:
            await asyncio.sleep(self.rate_limit_delay - time_since_last)
        
        self.last_request_time = time.time()
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        retry=retry_if_exception_type((httpx.RequestError, SalesDriveRateLimitError))
    )
    async def _make_request(
        self, 
        method: str, 
        endpoint: str, 
        params: Optional[Dict] = None,
        json_data: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Выполнение HTTP запроса с retry механизмом."""
        await self._rate_limit()
        
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        
        try:
            logger.info(f"SalesDrive API request: {method} {url}")
            
            response = await self.client.request(
                method=method,
                url=url,
                params=params,
                json=json_data
            )
            
            # Логирование ответа
            logger.info(f"SalesDrive API response: {response.status_code}")
            
            # Обработка ошибок
            if response.status_code == 401:
                raise SalesDriveAuthError("Неверный API ключ")
            elif response.status_code == 429:
                retry_after = int(response.headers.get('Retry-After', 60))
                logger.warning(f"Rate limit exceeded, retry after {retry_after}s")
                await asyncio.sleep(retry_after)
                raise SalesDriveRateLimitError("Превышен лимит запросов")
            elif response.status_code >= 400:
                error_text = response.text
                logger.error(f"SalesDrive API error: {response.status_code} - {error_text}")
                raise SalesDriveAPIError(f"API error: {response.status_code} - {error_text}")
            
            return response.json()
            
        except httpx.RequestError as e:
            logger.error(f"Request error: {e}")
            raise SalesDriveAPIError(f"Ошибка соединения: {e}")
    
    async def get_products(
        self, 
        page: int = 1, 
        limit: int = 100,
        updated_since: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Получение списка товаров."""
        params = {
            'page': page,
            'limit': min(limit, 1000),  # Максимум 1000 за запрос
        }
        
        if updated_since:
            params['updated_since'] = updated_since.isoformat()
        
        return await self._make_request('GET', '/api/products', params=params)
    
    async def get_product(self, product_id: str) -> Dict[str, Any]:
        """Получение конкретного товара."""
        return await self._make_request('GET', f'/api/products/{product_id}')
    
    async def get_orders(
        self,
        date_from: datetime,
        date_to: datetime,
        page: int = 1,
        limit: int = 100,
        status: Optional[str] = None
    ) -> Dict[str, Any]:
        """Получение заявок за период."""
        params = {
            'date_from': date_from.isoformat(),
            'date_to': date_to.isoformat(),
            'page': page,
            'limit': min(limit, 1000),
        }
        
        if status:
            params['status'] = status
        
        return await self._make_request('GET', '/api/orders', params=params)
    
    async def get_order(self, order_id: str) -> Dict[str, Any]:
        """Получение конкретной заявки."""
        return await self._make_request('GET', f'/api/orders/{order_id}')
    
    async def create_product(self, product_data: Dict[str, Any]) -> Dict[str, Any]:
        """Создание товара в SalesDrive."""
        return await self._make_request('POST', '/api/products', json_data=product_data)
    
    async def update_product(self, product_id: str, product_data: Dict[str, Any]) -> Dict[str, Any]:
        """Обновление товара в SalesDrive."""
        return await self._make_request('PUT', f'/api/products/{product_id}', json_data=product_data)
    
    async def get_categories(self) -> Dict[str, Any]:
        """Получение категорий."""
        return await self._make_request('GET', '/api/categories')
    
    async def get_suppliers(self) -> Dict[str, Any]:
        """Получение поставщиков."""
        return await self._make_request('GET', '/api/suppliers')


class SalesDriveService:
    """Сервис синхронизации с SalesDrive."""
    
    def __init__(self, db: Session, config: Optional[SalesDriveConfig] = None):
        self.db = db
        self.config = config or SalesDriveConfig(
            api_url=settings.SALESDRIVE_API_URL,
            api_key=settings.SALESDRIVE_API_KEY,
            timeout=settings.SALESDRIVE_TIMEOUT
        )
        
        # Кеш для категорий и поставщиков
        self._categories_cache = {}
        self._suppliers_cache = {}
        self._cache_ttl = 3600  # 1 час
        self._cache_updated = 0
    
    async def _get_client(self) -> SalesDriveClient:
        """Получение клиента API."""
        return SalesDriveClient(self.config)
    
    async def _update_cache(self, client: SalesDriveClient):
        """Обновление кеша категорий и поставщиков."""
        current_time = time.time()
        
        if current_time - self._cache_updated < self._cache_ttl:
            return
        
        try:
            # Загружаем категории
            categories_response = await client.get_categories()
            self._categories_cache = {
                cat['name']: cat for cat in categories_response.get('data', [])
            }
            
            # Загружаем поставщиков
            suppliers_response = await client.get_suppliers()
            self._suppliers_cache = {
                sup['name']: sup for sup in suppliers_response.get('data', [])
            }
            
            self._cache_updated = current_time
            logger.info("Cache updated successfully")
            
        except Exception as e:
            logger.error(f"Failed to update cache: {e}")
    
    def _find_or_create_category(self, category_name: str) -> Optional[CategoryModel]:
        """Поиск или создание категории."""
        if not category_name:
            return None
        
        # Ищем в базе
        category = self.db.query(CategoryModel).filter(
            CategoryModel.name == category_name
        ).first()
        
        if not category:
            # Создаем новую категорию
            category = CategoryModel(
                name=category_name,
                description=f"Автоматически создана при импорте из SalesDrive"
            )
            self.db.add(category)
            self.db.flush()
            logger.info(f"Created new category: {category_name}")
        
        return category
    
    def _find_or_create_supplier(self, supplier_name: str) -> Optional[SupplierModel]:
        """Поиск или создание поставщика."""
        if not supplier_name:
            return None
        
        # Ищем в базе
        supplier = self.db.query(SupplierModel).filter(
            SupplierModel.name == supplier_name
        ).first()
        
        if not supplier:
            # Создаем нового поставщика
            supplier = SupplierModel(
                name=supplier_name,
                contact_person="Автоимпорт",
                email=f"import@{supplier_name.lower().replace(' ', '')}.com"
            )
            self.db.add(supplier)
            self.db.flush()
            logger.info(f"Created new supplier: {supplier_name}")
        
        return supplier
    
    def _convert_salesdrive_product(self, sd_product: Dict[str, Any]) -> ProductModel:
        """Конвертация товара из SalesDrive в модель базы данных."""
        # Находим или создаем категорию
        category = None
        if sd_product.get('category'):
            category = self._find_or_create_category(sd_product['category'])
        
        # Находим или создаем поставщика
        supplier = None
        if sd_product.get('supplier'):
            supplier = self._find_or_create_supplier(sd_product['supplier'])
        
        # Создаем товар
        product = ProductModel(
            name=sd_product['name'],
            sku=sd_product['sku'],
            barcode=sd_product.get('barcode'),
            description=sd_product.get('description'),
            unit_price=sd_product['price'],
            cost_price=sd_product.get('cost'),
            unit_of_measure=sd_product.get('unit', 'шт'),
            category_id=category.id if category else None,
            supplier_id=supplier.id if supplier else None,
            status='active' if sd_product.get('active', True) else 'inactive'
        )
        
        return product
    
    async def get_products(
        self, 
        page: int = 1, 
        limit: int = 100,
        updated_since: Optional[datetime] = None
    ) -> List[SalesDriveProduct]:
        """Получение товаров из SalesDrive."""
        async with await self._get_client() as client:
            await self._update_cache(client)
            
            response = await client.get_products(
                page=page, 
                limit=limit, 
                updated_since=updated_since
            )
            
            products = []
            for item in response.get('data', []):
                try:
                    product = SalesDriveProduct(
                        id=item['id'],
                        name=item['name'],
                        sku=item['sku'],
                        barcode=item.get('barcode'),
                        category=item.get('category'),
                        supplier=item.get('supplier'),
                        description=item.get('description'),
                        price=float(item['price']),
                        cost=float(item.get('cost', 0)),
                        quantity=int(item.get('quantity', 0)),
                        unit=item.get('unit', 'шт'),
                        updated_at=datetime.fromisoformat(item['updated_at'])
                    )
                    products.append(product)
                except Exception as e:
                    logger.error(f"Error parsing product {item.get('id')}: {e}")
            
            return products
    
    async def get_orders(
        self,
        date_from: datetime,
        date_to: datetime,
        page: int = 1,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Получение заявок из SalesDrive."""
        async with await self._get_client() as client:
            response = await client.get_orders(
                date_from=date_from,
                date_to=date_to,
                page=page,
                limit=limit
            )
            
            return response.get('data', [])
    
    async def sync_products(self, user_id: UUID) -> ImportResult:
        """Синхронизация товаров из SalesDrive."""
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
        
        # Создаем запись о синхронизации
        import_log = SyncHistoryModel(
            sync_type="salesdrive_products",
            status=SyncStatus.RUNNING,
            created_by=user_id,
            started_at=start_time
        )
        self.db.add(import_log)
        self.db.commit()
        
        try:
            page = 1
            has_more = True
            
            while has_more:
                logger.info(f"Syncing products page {page}")
                
                # Получаем товары из SalesDrive
                products = await self.get_products(page=page, limit=100)
                
                if not products:
                    has_more = False
                    break
                
                result.total_items += len(products)
                
                for sd_product in products:
                    try:
                        # Ищем существующий товар по SKU
                        existing_product = self.db.query(ProductModel).filter(
                            ProductModel.sku == sd_product.sku
                        ).first()
                        
                        if existing_product:
                            # Обновляем существующий товар
                            existing_product.name = sd_product.name
                            existing_product.unit_price = sd_product.price
                            existing_product.cost_price = sd_product.cost or existing_product.cost_price
                            existing_product.description = sd_product.description or existing_product.description
                            
                            result.updated_items += 1
                            logger.debug(f"Updated product: {sd_product.sku}")
                        else:
                            # Создаем новый товар
                            new_product = self._convert_salesdrive_product(sd_product.dict())
                            self.db.add(new_product)
                            
                            result.created_items += 1
                            logger.debug(f"Created product: {sd_product.sku}")
                        
                        result.processed_items += 1
                        
                    except Exception as e:
                        result.failed_items += 1
                        error_msg = f"Error processing product {sd_product.sku}: {str(e)}"
                        result.errors.append(error_msg)
                        logger.error(error_msg)
                
                # Сохраняем изменения после каждой страницы
                self.db.commit()
                
                page += 1
                
                # Проверяем, есть ли еще страницы
                if len(products) < 100:
                    has_more = False
            
            # Обновляем статус синхронизации
            import_log.status = SyncStatus.SUCCESS
            import_log.completed_at = datetime.utcnow()
            import_log.items_processed = result.processed_items
            import_log.items_created = result.created_items
            import_log.items_updated = result.updated_items
            import_log.items_failed = result.failed_items
            import_log.details = result.dict()
            
            logger.info(f"Products sync completed: {result.processed_items} processed, "
                       f"{result.created_items} created, {result.updated_items} updated, "
                       f"{result.failed_items} failed")
            
        except Exception as e:
            # Обновляем статус при ошибке
            import_log.status = SyncStatus.ERROR
            import_log.completed_at = datetime.utcnow()
            import_log.error_message = str(e)
            
            result.errors.append(f"Sync failed: {str(e)}")
            logger.error(f"Products sync failed: {e}")
            
            raise SalesDriveAPIError(f"Ошибка синхронизации товаров: {e}")
        
        finally:
            self.db.commit()
        
        return result
    
    async def sync_orders(
        self, 
        user_id: UUID,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None
    ) -> ImportResult:
        """Синхронизация заказов из SalesDrive."""
        if not date_from:
            date_from = datetime.utcnow() - timedelta(days=7)
        if not date_to:
            date_to = datetime.utcnow()
        
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
            page = 1
            has_more = True
            
            while has_more:
                logger.info(f"Syncing orders page {page}")
                
                # Получаем заказы из SalesDrive
                orders = await self.get_orders(
                    date_from=date_from,
                    date_to=date_to,
                    page=page,
                    limit=100
                )
                
                if not orders:
                    has_more = False
                    break
                
                result.total_items += len(orders)
                
                for order in orders:
                    try:
                        # Здесь можно добавить логику обработки заказов
                        # Например, создание записей в таблице заказов
                        result.processed_items += 1
                        result.created_items += 1
                        
                    except Exception as e:
                        result.failed_items += 1
                        error_msg = f"Error processing order {order.get('id')}: {str(e)}"
                        result.errors.append(error_msg)
                        logger.error(error_msg)
                
                page += 1
                
                if len(orders) < 100:
                    has_more = False
            
            logger.info(f"Orders sync completed: {result.processed_items} processed")
            
        except Exception as e:
            result.errors.append(f"Orders sync failed: {str(e)}")
            logger.error(f"Orders sync failed: {e}")
            raise SalesDriveAPIError(f"Ошибка синхронизации заказов: {e}")
        
        return result
    
    async def test_connection(self) -> bool:
        """Тестирование соединения с SalesDrive API."""
        try:
            async with await self._get_client() as client:
                # Пробуем получить первую страницу товаров
                await client.get_products(page=1, limit=1)
                return True
        except Exception as e:
            logger.error(f"Connection test failed: {e}")
            return False 