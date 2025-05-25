# Интеграция с SalesDrive API

## Обзор

Система управления товарными остатками включает полнофункциональную интеграцию с SalesDrive API для синхронизации товаров, заказов и других данных.

## Возможности

### 🔄 Синхронизация данных
- **Товары**: Автоматическая синхронизация каталога товаров
- **Заказы**: Получение заказов за указанный период
- **Категории**: Синхронизация структуры категорий
- **Поставщики**: Обновление информации о поставщиках

### 🛡️ Надежность
- **Retry механизм**: Автоматические повторы при сбоях
- **Rate limiting**: Контроль частоты запросов
- **Обработка ошибок**: Детальное логирование и обработка ошибок
- **Кеширование**: Кеширование справочных данных

### 📊 Мониторинг
- **Логирование**: Подробные логи всех операций
- **Статистика**: Отчеты о результатах синхронизации
- **Webhook**: Обработка событий в реальном времени

## Архитектура

### Компоненты

```
SalesDriveClient
├── HTTP клиент с retry механизмом
├── Rate limiting
├── Обработка ошибок API
└── Методы для всех эндпоинтов

SalesDriveService
├── Бизнес-логика синхронизации
├── Кеширование справочников
├── Конвертация данных
└── Управление транзакциями

SalesDrive Endpoints
├── /integration/salesdrive/test-connection
├── /integration/salesdrive/products
├── /integration/salesdrive/orders
├── /integration/salesdrive/sync
└── /integration/salesdrive/webhook
```

### Схемы данных

#### SalesDriveProduct
```python
{
    "id": "string",
    "name": "string",
    "sku": "string",
    "barcode": "string",
    "category_name": "string",
    "supplier_name": "string",
    "unit_price": "decimal",
    "cost_price": "decimal",
    "unit_of_measure": "string",
    "status": "active|inactive|archived",
    "updated_at": "datetime"
}
```

#### SalesDriveOrder
```python
{
    "id": "string",
    "number": "string",
    "status": "new|confirmed|processing|shipped|delivered|cancelled",
    "customer_name": "string",
    "total_amount": "decimal",
    "items": [
        {
            "product_sku": "string",
            "quantity": "integer",
            "unit_price": "decimal"
        }
    ],
    "created_at": "datetime"
}
```

## Настройка

### Переменные окружения

```bash
# SalesDrive API
SALESDRIVE_API_URL=https://api.salesdrive.ru
SALESDRIVE_API_KEY=your_api_key_here
SALESDRIVE_TIMEOUT=30
SALESDRIVE_MAX_RETRIES=3
SALESDRIVE_RATE_LIMIT_DELAY=1.0
SALESDRIVE_WEBHOOK_SECRET=your_webhook_secret
SALESDRIVE_AUTO_SYNC_ENABLED=false
SALESDRIVE_SYNC_INTERVAL_MINUTES=60
```

### Конфигурация в коде

```python
from app.api.v1.schemas.salesdrive import SalesDriveApiConfig

config = SalesDriveApiConfig(
    api_url="https://api.salesdrive.ru",
    api_key="your_api_key",
    timeout=30,
    max_retries=3,
    rate_limit_delay=1.0
)
```

## Использование

### Тестирование соединения

```python
POST /api/v1/integration/salesdrive/test-connection
```

```json
{
    "success": true,
    "message": "Соединение с SalesDrive API успешно установлено",
    "response_time": 0.5
}
```

### Получение товаров

```python
GET /api/v1/integration/salesdrive/products?page=1&limit=100
```

```json
[
    {
        "id": "1",
        "name": "Товар 1",
        "sku": "SKU001",
        "price": 100.0,
        "category": "Категория 1"
    }
]
```

### Синхронизация товаров

```python
POST /api/v1/integration/salesdrive/sync/products
```

```json
{
    "total_items": 150,
    "processed_items": 150,
    "created_items": 10,
    "updated_items": 140,
    "failed_items": 0,
    "errors": [],
    "warnings": []
}
```

### Получение заказов

```python
GET /api/v1/integration/salesdrive/orders?date_from=2023-01-01&date_to=2023-01-31
```

### Полная синхронизация

```python
POST /api/v1/integration/salesdrive/sync
Content-Type: application/json

{
    "sync_products": true,
    "sync_orders": true,
    "sync_categories": true,
    "sync_suppliers": true,
    "date_from": "2023-01-01T00:00:00",
    "date_to": "2023-01-31T23:59:59",
    "full_sync": false,
    "auto_create_categories": true,
    "auto_create_suppliers": true,
    "update_existing": true
}
```

## Обработка ошибок

### Типы ошибок

1. **SalesDriveAuthError** - Ошибки авторизации (401)
2. **SalesDriveRateLimitError** - Превышение лимитов (429)
3. **SalesDriveAPIError** - Общие ошибки API (4xx, 5xx)

### Retry механизм

```python
@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=4, max=10),
    retry=retry_if_exception_type((httpx.RequestError, SalesDriveRateLimitError))
)
async def _make_request(self, method, endpoint, params=None, json_data=None):
    # Логика запроса с автоматическими повторами
```

### Логирование

```python
import logging

logger = logging.getLogger(__name__)

# Логирование запросов
logger.info(f"SalesDrive API request: {method} {url}")

# Логирование ошибок
logger.error(f"SalesDrive API error: {response.status_code} - {error_text}")

# Логирование результатов синхронизации
logger.info(f"Products sync completed: {result.processed_items} processed")
```

## Webhook обработка

### Настройка webhook в SalesDrive

1. Перейдите в настройки SalesDrive
2. Добавьте webhook URL: `https://your-domain.com/api/v1/integration/salesdrive/webhook`
3. Укажите секретный ключ для подписи
4. Выберите события для отправки

### Обработка событий

```python
POST /api/v1/integration/salesdrive/webhook
Content-Type: application/json

{
    "event_type": "product.updated",
    "event_id": "evt_123",
    "timestamp": "2023-01-01T12:00:00Z",
    "data": {
        "id": "product_123",
        "sku": "SKU001",
        "name": "Updated Product"
    },
    "signature": "sha256=..."
}
```

### Поддерживаемые события

- `product.created` - Создан новый товар
- `product.updated` - Обновлен товар
- `product.deleted` - Удален товар
- `order.created` - Создан новый заказ
- `order.status_changed` - Изменен статус заказа
- `inventory.updated` - Обновлены остатки

## Мониторинг и отладка

### Статус синхронизации

```python
GET /api/v1/integration/salesdrive/sync/status
```

```json
[
    {
        "id": "sync-1",
        "type": "products",
        "status": "completed",
        "started_at": "2023-01-01T10:00:00Z",
        "completed_at": "2023-01-01T10:05:00Z",
        "processed_items": 150,
        "created_items": 10,
        "updated_items": 140,
        "failed_items": 0
    }
]
```

### Логи

Все операции логируются с уровнем INFO или выше:

```
2023-01-01 10:00:00 INFO Starting products sync...
2023-01-01 10:00:01 INFO SalesDrive API request: GET /api/products
2023-01-01 10:00:02 INFO SalesDrive API response: 200
2023-01-01 10:00:03 INFO Created new category: Electronics
2023-01-01 10:00:04 INFO Updated product: SKU001
2023-01-01 10:00:05 INFO Products sync completed: 150 processed
```

## Производительность

### Оптимизации

1. **Пагинация**: Обработка больших объемов данных по частям
2. **Кеширование**: Кеширование категорий и поставщиков
3. **Batch операции**: Группировка операций с базой данных
4. **Rate limiting**: Соблюдение лимитов API

### Рекомендации

- Запускайте полную синхронизацию в нерабочее время
- Используйте инкрементальную синхронизацию для регулярных обновлений
- Настройте webhook для получения изменений в реальном времени
- Мониторьте логи для выявления проблем

## Безопасность

### API ключ

- Храните API ключ в переменных окружения
- Не включайте ключ в код или логи
- Регулярно обновляйте ключ

### Webhook безопасность

- Используйте секретный ключ для проверки подписи
- Проверяйте источник запросов
- Ограничьте доступ к webhook эндпоинту

### Обработка данных

- Валидируйте все входящие данные
- Используйте транзакции для атомарности операций
- Логируйте все изменения для аудита

## Тестирование

### Unit тесты

```bash
# Запуск всех тестов
pytest tests/test_salesdrive_integration.py -v

# Запуск конкретного теста
pytest tests/test_salesdrive_integration.py::TestSalesDriveClient::test_successful_request -v
```

### Интеграционные тесты

```bash
# Требуют реального API ключа
export SALESDRIVE_TEST_API_KEY=your_test_key
pytest tests/test_salesdrive_integration.py::TestSalesDriveIntegration -v -m integration
```

### Мок тестирование

```python
@patch.object(SalesDriveClient, '_make_request')
async def test_sync_products(mock_request):
    mock_request.return_value = {"data": [...]}
    # Тест логики без реальных API вызовов
```

## Troubleshooting

### Частые проблемы

1. **401 Unauthorized**
   - Проверьте API ключ
   - Убедитесь, что ключ активен

2. **429 Too Many Requests**
   - Увеличьте `rate_limit_delay`
   - Уменьшите частоту запросов

3. **Timeout ошибки**
   - Увеличьте `timeout`
   - Проверьте сетевое соединение

4. **Ошибки валидации**
   - Проверьте формат данных
   - Обновите схемы при изменении API

### Отладка

```python
# Включение детального логирования
import logging
logging.getLogger('app.api.v1.services.salesdrive_service').setLevel(logging.DEBUG)

# Тестирование соединения
from app.api.v1.services.salesdrive_service import SalesDriveService
service = SalesDriveService(db)
result = await service.test_connection()
print(f"Connection test: {result}")
```

## Roadmap

### Планируемые улучшения

- [ ] Автоматическая синхронизация по расписанию
- [ ] Двусторонняя синхронизация (отправка данных в SalesDrive)
- [ ] Графический интерфейс для настройки синхронизации
- [ ] Расширенная аналитика синхронизации
- [ ] Поддержка дополнительных типов данных
- [ ] Оптимизация производительности для больших объемов

### Версионирование

- **v1.0** - Базовая синхронизация товаров и заказов
- **v1.1** - Webhook поддержка
- **v1.2** - Расширенное логирование и мониторинг
- **v2.0** - Двусторонняя синхронизация (планируется)

## Поддержка

Для получения помощи:

1. Проверьте логи приложения
2. Изучите документацию SalesDrive API
3. Создайте issue в репозитории проекта
4. Обратитесь к команде разработки 