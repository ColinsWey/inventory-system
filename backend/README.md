# REST API для системы управления товарными остатками

Полнофункциональный REST API на FastAPI для управления товарными остатками с интеграцией SalesDrive.

## Возможности

### 🔐 Авторизация
- JWT токены для безопасного доступа
- Ролевая модель (admin, manager, operator, viewer)
- Управление пользователями

### 📦 Товары
- CRUD операции с товарами
- Расширенная фильтрация и поиск
- Массовые операции
- Управление категориями и тегами
- Отслеживание остатков

### 📊 Категории
- Иерархические категории
- Дерево категорий
- Управление структурой

### 📥 Импорт данных
- Импорт из SalesDrive API
- Импорт из Excel/CSV файлов
- Валидация и предварительный просмотр
- Статус и история импорта

### 📈 Прогнозирование
- Расчет прогнозов продаж
- Шаблоны сезонности
- Аналитика точности прогнозов

## Быстрый старт

### 1. Установка зависимостей

```bash
cd backend
pip install -r requirements.txt
```

### 2. Настройка базы данных

```bash
# Создание и настройка БД
python database/migrate.py init
python database/migrate.py up
python database/migrate.py seed
```

### 3. Настройка переменных окружения

Создайте файл `.env`:

```env
# База данных
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/inventory_system
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=inventory_system
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres

# JWT
SECRET_KEY=your_super_secret_jwt_key_here_change_in_production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# SalesDrive
SALESDRIVE_API_URL=https://api.salesdrive.ru
SALESDRIVE_API_KEY=your_api_key_here

# Приложение
DEBUG=true
ENVIRONMENT=development
```

### 4. Запуск сервера

```bash
# Режим разработки
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Или через Python
python -m app.main
```

API будет доступно по адресу: http://localhost:8000

## Документация API

### Интерактивная документация
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/api/v1/openapi.json

### Основные эндпоинты

#### Авторизация
```
POST /api/v1/auth/login          # Вход в систему
GET  /api/v1/auth/me             # Информация о пользователе
PUT  /api/v1/auth/me             # Обновление профиля
POST /api/v1/auth/change-password # Смена пароля
POST /api/v1/auth/users          # Создание пользователя (admin)
```

#### Товары
```
GET    /api/v1/products              # Список товаров с фильтрами
GET    /api/v1/products/{id}         # Карточка товара
POST   /api/v1/products              # Создание товара
PUT    /api/v1/products/{id}         # Обновление товара
DELETE /api/v1/products/{id}         # Удаление товара
POST   /api/v1/products/bulk-update  # Массовое обновление
```

#### Категории
```
GET    /api/v1/categories              # Список категорий
GET    /api/v1/categories/tree         # Дерево категорий
GET    /api/v1/categories/{id}         # Информация о категории
POST   /api/v1/categories              # Создание категории
PUT    /api/v1/categories/{id}         # Обновление категории
DELETE /api/v1/categories/{id}         # Удаление категории
GET    /api/v1/categories/{id}/path    # Путь к категории
```

#### Импорт (планируется)
```
POST /api/v1/import/salesdrive    # Импорт из SalesDrive
GET  /api/v1/import/status        # Статус импорта
POST /api/v1/import/excel         # Импорт из Excel
POST /api/v1/import/preview       # Предварительный просмотр
```

#### Прогнозирование (планируется)
```
GET  /api/v1/forecast/{product_id}  # Прогноз по товару
POST /api/v1/forecast/calculate     # Пересчет прогнозов
GET  /api/v1/forecast/analytics     # Аналитика прогнозов
```

## Примеры использования

### Авторизация

```bash
# Вход в систему
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin"
  }'

# Ответ
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "expires_in": 1800,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "admin",
    "email": "admin@inventory.local",
    "role": "admin"
  }
}
```

### Работа с товарами

```bash
# Получение списка товаров с фильтрами
curl -X GET "http://localhost:8000/api/v1/products?page=1&size=20&search=iPhone&category_id=550e8400-e29b-41d4-a716-446655440110" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Создание товара
curl -X POST "http://localhost:8000/api/v1/products" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "iPhone 15 Pro Max",
    "sku": "IPHONE15PROMAX256",
    "unit_price": 119990.00,
    "category_id": "550e8400-e29b-41d4-a716-446655440110",
    "description": "Новый iPhone 15 Pro Max 256GB"
  }'
```

### Работа с категориями

```bash
# Получение дерева категорий
curl -X GET "http://localhost:8000/api/v1/categories/tree" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Создание категории
curl -X POST "http://localhost:8000/api/v1/categories" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Планшеты",
    "description": "Планшетные компьютеры",
    "parent_id": "550e8400-e29b-41d4-a716-446655440100"
  }'
```

## Архитектура

### Структура проекта
```
backend/
├── app/
│   ├── api/v1/                 # API версии 1
│   │   ├── endpoints/          # Эндпоинты
│   │   ├── schemas/            # Pydantic схемы
│   │   ├── services/           # Бизнес-логика
│   │   └── dependencies.py     # Зависимости FastAPI
│   ├── core/                   # Ядро приложения
│   │   ├── config.py          # Конфигурация
│   │   └── database/          # Подключение к БД
│   ├── database/              # Модели SQLAlchemy
│   └── main.py               # Точка входа
├── database/                  # Миграции и схема БД
├── requirements.txt          # Зависимости
└── README.md                # Документация
```

### Технологический стек
- **FastAPI** - современный веб-фреймворк
- **SQLAlchemy** - ORM для работы с БД
- **PostgreSQL** - основная база данных
- **Pydantic** - валидация данных
- **JWT** - авторизация
- **Uvicorn** - ASGI сервер

### Принципы проектирования
- **Clean Architecture** - разделение слоев
- **Dependency Injection** - инверсия зависимостей
- **Repository Pattern** - абстракция доступа к данным
- **Service Layer** - бизнес-логика
- **Schema Validation** - строгая типизация

## Безопасность

### Авторизация
- JWT токены с истечением срока действия
- Ролевая модель доступа
- Хеширование паролей с bcrypt
- Защита от CSRF атак

### Валидация
- Строгая валидация входных данных
- Санитизация пользовательского ввода
- Ограничения на размер файлов
- Проверка типов данных

### CORS
- Настраиваемые разрешенные домены
- Контроль методов и заголовков
- Поддержка credentials

## Мониторинг и логирование

### Логирование
- Структурированные логи
- Различные уровни логирования
- Ротация файлов логов
- Логирование всех операций с товарами

### Метрики
- Время ответа API
- Количество запросов
- Ошибки и исключения
- Использование ресурсов

## Тестирование

```bash
# Запуск тестов
pytest

# Тесты с покрытием
pytest --cov=app

# Тесты конкретного модуля
pytest tests/test_products.py
```

## Развертывание

### Docker
```bash
# Сборка образа
docker build -t inventory-api .

# Запуск контейнера
docker run -p 8000:8000 inventory-api
```

### Docker Compose
```bash
# Запуск всего стека
docker-compose up -d
```

### Production
- Используйте HTTPS
- Настройте reverse proxy (nginx)
- Включите мониторинг
- Настройте резервное копирование БД
- Используйте переменные окружения для секретов

## Поддержка

### Логи
Логи приложения находятся в директории `logs/`

### Отладка
Включите режим отладки в `.env`:
```env
DEBUG=true
LOG_LEVEL=DEBUG
```

### Проблемы
- Проверьте подключение к БД
- Убедитесь в правильности переменных окружения
- Проверьте логи на наличие ошибок
- Убедитесь в актуальности миграций БД

## Лицензия

MIT License 