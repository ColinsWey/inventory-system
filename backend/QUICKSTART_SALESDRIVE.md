# Быстрый старт: Интеграция с SalesDrive

## 🚀 Запуск за 5 минут

### 1. Установка зависимостей

```bash
cd backend
pip install -r requirements.txt
```

### 2. Настройка API ключа

Обновите файл `backend/app/core/config.py`:

```python
SALESDRIVE_API_KEY = "2gXtjXXdqB8Ih9ALlHk3eGerWhY52Dz9b-JQ52vXqt0uFvdcWQRj2kTeROb3r42Nib_r0OLrKKGMAQads NobSajn_ZKWCxzpuzas"
```

Или установите переменную окружения:

```bash
export SALESDRIVE_API_KEY="2gXtjXXdqB8Ih9ALlHk3eGerWhY52Dz9b-JQ52vXqt0uFvdcWQRj2kTeROb3r42Nib_r0OLrKKGMAQads NobSajn_ZKWCxzpuzas"
```

### 3. Тестирование интеграции

```bash
cd backend
python scripts/test_salesdrive.py
```

Ожидаемый вывод:
```
🚀 Запуск тестирования интеграции с SalesDrive API
============================================================
⚙️ Конфигурация SalesDrive:
  API URL: https://api.salesdrive.ru
  API Key: 2gXtjXXdqB8Ih9ALlHk3...
  Timeout: 30s

🔗 Тестирование соединения с SalesDrive API...
✅ Соединение успешно! Получен ответ: 1 товаров

📦 Тестирование получения товаров...
✅ Получено товаров: 5
  1. Товар 1 (SKU: SKU001)
  2. Товар 2 (SKU: SKU002)
  3. Товар 3 (SKU: SKU003)

📊 Итоговый отчет:
  Соединение: ✅ ПРОЙДЕН
  Получение товаров: ✅ ПРОЙДЕН
  Получение заказов: ✅ ПРОЙДЕН
  Категории и поставщики: ✅ ПРОЙДЕН
  Rate limiting: ✅ ПРОЙДЕН

Результат: 5/5 тестов пройдено
🎉 Все тесты пройдены! Интеграция с SalesDrive работает корректно.
```

### 4. Запуск API сервера

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 5. Тестирование эндпоинтов

Откройте браузер: http://localhost:8000/docs

#### Тест соединения:
```bash
curl -X POST "http://localhost:8000/api/v1/integration/salesdrive/test-connection" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

#### Получение товаров:
```bash
curl -X GET "http://localhost:8000/api/v1/integration/salesdrive/products?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Синхронизация товаров:
```bash
curl -X POST "http://localhost:8000/api/v1/integration/salesdrive/sync/products" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

## 📋 Доступные эндпоинты

| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| POST | `/integration/salesdrive/test-connection` | Тест соединения |
| GET | `/integration/salesdrive/products` | Получение товаров |
| GET | `/integration/salesdrive/orders` | Получение заказов |
| POST | `/integration/salesdrive/sync/products` | Синхронизация товаров |
| POST | `/integration/salesdrive/sync/orders` | Синхронизация заказов |
| POST | `/integration/salesdrive/sync` | Полная синхронизация |
| GET | `/integration/salesdrive/sync/status` | Статус синхронизации |
| POST | `/integration/salesdrive/webhook` | Webhook обработчик |

## 🔧 Настройки

### Основные параметры

```python
# В config.py
SALESDRIVE_API_URL = "https://api.salesdrive.ru"
SALESDRIVE_API_KEY = "your_api_key"
SALESDRIVE_TIMEOUT = 30
SALESDRIVE_MAX_RETRIES = 3
SALESDRIVE_RATE_LIMIT_DELAY = 1.0
```

### Переменные окружения

```bash
export SALESDRIVE_API_URL="https://api.salesdrive.ru"
export SALESDRIVE_API_KEY="your_api_key"
export SALESDRIVE_TIMEOUT=30
export SALESDRIVE_MAX_RETRIES=3
export SALESDRIVE_RATE_LIMIT_DELAY=1.0
export SALESDRIVE_WEBHOOK_SECRET="your_webhook_secret"
```

## 🧪 Запуск тестов

```bash
# Все тесты
pytest tests/test_salesdrive_integration.py -v

# Только unit тесты
pytest tests/test_salesdrive_integration.py::TestSalesDriveClient -v

# Интеграционные тесты (требуют реальный API ключ)
export SALESDRIVE_TEST_API_KEY="your_test_key"
pytest tests/test_salesdrive_integration.py::TestSalesDriveIntegration -v -m integration
```

## 🐛 Решение проблем

### Ошибка 401 Unauthorized
```bash
# Проверьте API ключ
echo $SALESDRIVE_API_KEY

# Обновите ключ в конфигурации
```

### Ошибка 429 Too Many Requests
```python
# Увеличьте задержку между запросами
SALESDRIVE_RATE_LIMIT_DELAY = 2.0
```

### Timeout ошибки
```python
# Увеличьте таймаут
SALESDRIVE_TIMEOUT = 60
```

### Ошибки импорта
```bash
# Убедитесь, что все зависимости установлены
pip install httpx tenacity

# Проверьте структуру проекта
ls -la app/api/v1/services/
```

## 📚 Дополнительная документация

- [Полная документация](SALESDRIVE_INTEGRATION.md)
- [API Reference](http://localhost:8000/docs)
- [Схемы данных](app/api/v1/schemas/salesdrive.py)

## 🆘 Поддержка

При возникновении проблем:

1. Проверьте логи: `tail -f logs/app.log`
2. Запустите тест: `python scripts/test_salesdrive.py`
3. Проверьте конфигурацию: `python -c "from app.core.config import settings; print(settings.SALESDRIVE_API_KEY[:20])"`
4. Создайте issue в репозитории проекта 