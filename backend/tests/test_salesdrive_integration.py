"""
Тесты для интеграции с SalesDrive API.
"""

import pytest
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime, timedelta
from decimal import Decimal

from backend.app.api.v1.services.salesdrive_service import (
    SalesDriveClient, SalesDriveService, SalesDriveAPIError,
    SalesDriveRateLimitError, SalesDriveAuthError
)
from backend.app.api.v1.schemas.salesdrive import SalesDriveApiConfig
from backend.app.api.v1.schemas.import_data import ImportResult


class TestSalesDriveClient:
    """Тесты для SalesDriveClient."""
    
    @pytest.fixture
    def config(self):
        """Конфигурация для тестов."""
        return SalesDriveApiConfig(
            api_url="https://api.test.salesdrive.ru",
            api_key="test_api_key_12345",
            timeout=30
        )
    
    @pytest.fixture
    def client(self, config):
        """Клиент для тестов."""
        return SalesDriveClient(config)
    
    def test_client_initialization(self, client, config):
        """Тест инициализации клиента."""
        assert client.base_url == config.api_url
        assert client.api_key == config.api_key
        assert client.timeout == config.timeout
        assert client.max_retries == 3
        assert client.rate_limit_delay == 1.0
    
    @pytest.mark.asyncio
    async def test_rate_limiting(self, client):
        """Тест контроля частоты запросов."""
        import time
        
        start_time = time.time()
        await client._rate_limit()
        first_call_time = time.time()
        
        await client._rate_limit()
        second_call_time = time.time()
        
        # Второй вызов должен быть с задержкой
        time_diff = second_call_time - first_call_time
        assert time_diff >= client.rate_limit_delay
    
    @pytest.mark.asyncio
    async def test_successful_request(self, client):
        """Тест успешного запроса."""
        mock_response = {
            "data": [
                {
                    "id": "1",
                    "name": "Test Product",
                    "sku": "TEST001",
                    "price": 100.0
                }
            ],
            "total": 1
        }
        
        with patch.object(client.client, 'request') as mock_request:
            mock_resp = AsyncMock()
            mock_resp.status_code = 200
            mock_resp.json.return_value = mock_response
            mock_request.return_value = mock_resp
            
            result = await client._make_request('GET', '/api/products')
            
            assert result == mock_response
            mock_request.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_auth_error(self, client):
        """Тест ошибки авторизации."""
        with patch.object(client.client, 'request') as mock_request:
            mock_resp = AsyncMock()
            mock_resp.status_code = 401
            mock_request.return_value = mock_resp
            
            with pytest.raises(SalesDriveAuthError):
                await client._make_request('GET', '/api/products')
    
    @pytest.mark.asyncio
    async def test_rate_limit_error(self, client):
        """Тест ошибки превышения лимитов."""
        with patch.object(client.client, 'request') as mock_request:
            mock_resp = AsyncMock()
            mock_resp.status_code = 429
            mock_resp.headers = {'Retry-After': '60'}
            mock_request.return_value = mock_resp
            
            with patch('asyncio.sleep') as mock_sleep:
                with pytest.raises(SalesDriveRateLimitError):
                    await client._make_request('GET', '/api/products')
                
                mock_sleep.assert_called_with(60)
    
    @pytest.mark.asyncio
    async def test_api_error(self, client):
        """Тест общей ошибки API."""
        with patch.object(client.client, 'request') as mock_request:
            mock_resp = AsyncMock()
            mock_resp.status_code = 500
            mock_resp.text = "Internal Server Error"
            mock_request.return_value = mock_resp
            
            with pytest.raises(SalesDriveAPIError):
                await client._make_request('GET', '/api/products')
    
    @pytest.mark.asyncio
    async def test_get_products(self, client):
        """Тест получения товаров."""
        mock_response = {
            "data": [
                {
                    "id": "1",
                    "name": "Test Product",
                    "sku": "TEST001",
                    "price": 100.0,
                    "updated_at": "2023-01-01T00:00:00"
                }
            ],
            "pagination": {"page": 1, "per_page": 100},
            "total": 1
        }
        
        with patch.object(client, '_make_request', return_value=mock_response):
            result = await client.get_products(page=1, limit=100)
            
            assert result == mock_response
    
    @pytest.mark.asyncio
    async def test_get_orders(self, client):
        """Тест получения заказов."""
        date_from = datetime.utcnow() - timedelta(days=7)
        date_to = datetime.utcnow()
        
        mock_response = {
            "data": [
                {
                    "id": "1",
                    "number": "ORDER001",
                    "status": "new",
                    "total_amount": 500.0
                }
            ],
            "total": 1
        }
        
        with patch.object(client, '_make_request', return_value=mock_response):
            result = await client.get_orders(
                date_from=date_from,
                date_to=date_to,
                page=1,
                limit=100
            )
            
            assert result == mock_response


class TestSalesDriveService:
    """Тесты для SalesDriveService."""
    
    @pytest.fixture
    def mock_db(self):
        """Мок базы данных."""
        return MagicMock()
    
    @pytest.fixture
    def config(self):
        """Конфигурация для тестов."""
        return SalesDriveApiConfig(
            api_url="https://api.test.salesdrive.ru",
            api_key="test_api_key_12345",
            timeout=30
        )
    
    @pytest.fixture
    def service(self, mock_db, config):
        """Сервис для тестов."""
        return SalesDriveService(mock_db, config)
    
    def test_service_initialization(self, service, mock_db, config):
        """Тест инициализации сервиса."""
        assert service.db == mock_db
        assert service.config == config
        assert service._cache_ttl == 3600
        assert service._cache_updated == 0
    
    @pytest.mark.asyncio
    async def test_get_products(self, service):
        """Тест получения товаров."""
        mock_products_data = [
            {
                "id": "1",
                "name": "Test Product",
                "sku": "TEST001",
                "price": 100.0,
                "cost": 80.0,
                "quantity": 10,
                "unit": "шт",
                "updated_at": "2023-01-01T00:00:00"
            }
        ]
        
        mock_response = {
            "data": mock_products_data,
            "total": 1
        }
        
        with patch.object(service, '_get_client') as mock_get_client:
            mock_client = AsyncMock()
            mock_client.__aenter__.return_value = mock_client
            mock_client.__aexit__.return_value = None
            mock_client.get_products.return_value = mock_response
            mock_get_client.return_value = mock_client
            
            with patch.object(service, '_update_cache'):
                products = await service.get_products(page=1, limit=100)
                
                assert len(products) == 1
                assert products[0].name == "Test Product"
                assert products[0].sku == "TEST001"
                assert products[0].price == Decimal("100.0")
    
    @pytest.mark.asyncio
    async def test_sync_products_success(self, service, mock_db):
        """Тест успешной синхронизации товаров."""
        from uuid import uuid4
        from backend.app.api.v1.schemas.salesdrive import SalesDriveProduct
        
        user_id = uuid4()
        
        # Мок товаров из SalesDrive
        mock_products = [
            SalesDriveProduct(
                id="1",
                name="Test Product",
                sku="TEST001",
                price=Decimal("100.0"),
                cost=Decimal("80.0"),
                quantity=10,
                unit="шт",
                updated_at=datetime.utcnow()
            )
        ]
        
        # Мок модели SyncHistory
        mock_import_log = MagicMock()
        
        with patch.object(service, 'get_products', return_value=mock_products):
            with patch('app.database.models.SyncHistoryModel', return_value=mock_import_log):
                with patch.object(service, '_convert_salesdrive_product') as mock_convert:
                    mock_product = MagicMock()
                    mock_convert.return_value = mock_product
                    
                    # Мок запроса к базе данных
                    mock_db.query.return_value.filter.return_value.first.return_value = None
                    
                    result = await service.sync_products(user_id)
                    
                    assert isinstance(result, ImportResult)
                    assert result.total_items == 1
                    assert result.processed_items == 1
                    assert result.created_items == 1
                    assert result.updated_items == 0
                    assert result.failed_items == 0
    
    @pytest.mark.asyncio
    async def test_sync_products_with_existing(self, service, mock_db):
        """Тест синхронизации с существующими товарами."""
        from uuid import uuid4
        from backend.app.api.v1.schemas.salesdrive import SalesDriveProduct
        
        user_id = uuid4()
        
        # Мок товаров из SalesDrive
        mock_products = [
            SalesDriveProduct(
                id="1",
                name="Updated Product",
                sku="TEST001",
                price=Decimal("120.0"),
                cost=Decimal("90.0"),
                quantity=15,
                unit="шт",
                updated_at=datetime.utcnow()
            )
        ]
        
        # Мок существующего товара
        mock_existing_product = MagicMock()
        mock_existing_product.sku = "TEST001"
        mock_existing_product.name = "Old Product"
        mock_existing_product.unit_price = Decimal("100.0")
        
        mock_import_log = MagicMock()
        
        with patch.object(service, 'get_products', return_value=mock_products):
            with patch('app.database.models.SyncHistoryModel', return_value=mock_import_log):
                # Мок запроса к базе данных - товар существует
                mock_db.query.return_value.filter.return_value.first.return_value = mock_existing_product
                
                result = await service.sync_products(user_id)
                
                assert isinstance(result, ImportResult)
                assert result.total_items == 1
                assert result.processed_items == 1
                assert result.created_items == 0
                assert result.updated_items == 1
                assert result.failed_items == 0
                
                # Проверяем, что товар был обновлен
                assert mock_existing_product.name == "Updated Product"
                assert mock_existing_product.unit_price == Decimal("120.0")
    
    @pytest.mark.asyncio
    async def test_sync_products_with_error(self, service, mock_db):
        """Тест синхронизации с ошибкой."""
        from uuid import uuid4
        
        user_id = uuid4()
        
        with patch.object(service, 'get_products', side_effect=SalesDriveAPIError("API Error")):
            with patch('app.database.models.SyncHistoryModel'):
                with pytest.raises(SalesDriveAPIError):
                    await service.sync_products(user_id)
    
    @pytest.mark.asyncio
    async def test_test_connection_success(self, service):
        """Тест успешного тестирования соединения."""
        with patch.object(service, '_get_client') as mock_get_client:
            mock_client = AsyncMock()
            mock_client.__aenter__.return_value = mock_client
            mock_client.__aexit__.return_value = None
            mock_client.get_products.return_value = {"data": []}
            mock_get_client.return_value = mock_client
            
            result = await service.test_connection()
            
            assert result is True
    
    @pytest.mark.asyncio
    async def test_test_connection_failure(self, service):
        """Тест неудачного тестирования соединения."""
        with patch.object(service, '_get_client') as mock_get_client:
            mock_client = AsyncMock()
            mock_client.__aenter__.return_value = mock_client
            mock_client.__aexit__.return_value = None
            mock_client.get_products.side_effect = SalesDriveAPIError("Connection failed")
            mock_get_client.return_value = mock_client
            
            result = await service.test_connection()
            
            assert result is False
    
    def test_find_or_create_category(self, service, mock_db):
        """Тест поиска или создания категории."""
        from backend.app.database.models import CategoryModel
        
        category_name = "Test Category"
        
        # Тест создания новой категории
        mock_db.query.return_value.filter.return_value.first.return_value = None
        
        with patch('app.database.models.CategoryModel') as mock_category_model:
            mock_category = MagicMock()
            mock_category_model.return_value = mock_category
            
            result = service._find_or_create_category(category_name)
            
            assert result == mock_category
            mock_db.add.assert_called_once_with(mock_category)
            mock_db.flush.assert_called_once()
    
    def test_find_existing_category(self, service, mock_db):
        """Тест поиска существующей категории."""
        category_name = "Existing Category"
        mock_existing_category = MagicMock()
        
        # Мок существующей категории
        mock_db.query.return_value.filter.return_value.first.return_value = mock_existing_category
        
        result = service._find_or_create_category(category_name)
        
        assert result == mock_existing_category
        mock_db.add.assert_not_called()


class TestSalesDriveIntegration:
    """Интеграционные тесты."""
    
    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_full_sync_workflow(self):
        """Тест полного процесса синхронизации."""
        # Этот тест требует реального подключения к SalesDrive API
        # Запускается только при наличии соответствующих переменных окружения
        
        import os
        if not os.getenv('SALESDRIVE_TEST_API_KEY'):
            pytest.skip("Нет тестового API ключа SalesDrive")
        
        config = SalesDriveApiConfig(
            api_url=os.getenv('SALESDRIVE_TEST_API_URL', 'https://api.test.salesdrive.ru'),
            api_key=os.getenv('SALESDRIVE_TEST_API_KEY'),
            timeout=30
        )
        
        async with SalesDriveClient(config) as client:
            # Тест подключения
            products_response = await client.get_products(page=1, limit=1)
            assert 'data' in products_response
            
            # Тест получения заказов
            date_from = datetime.utcnow() - timedelta(days=1)
            date_to = datetime.utcnow()
            
            orders_response = await client.get_orders(
                date_from=date_from,
                date_to=date_to,
                page=1,
                limit=1
            )
            assert 'data' in orders_response


if __name__ == "__main__":
    # Запуск тестов
    pytest.main([__file__, "-v"]) 