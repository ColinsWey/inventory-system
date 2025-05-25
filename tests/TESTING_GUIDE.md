# 🧪 Руководство по тестированию системы управления товарными остатками

## 📋 Содержание

1. [Обзор системы тестирования](#обзор-системы-тестирования)
2. [Типы тестов](#типы-тестов)
3. [Тестовые сценарии](#тестовые-сценарии)
4. [Установка и настройка](#установка-и-настройка)
5. [Запуск тестов](#запуск-тестов)
6. [Тестовые данные](#тестовые-данные)
7. [Отчеты и метрики](#отчеты-и-метрики)
8. [Устранение неполадок](#устранение-неполадок)

## 🎯 Обзор системы тестирования

Комплексная система тестирования включает:

- **Unit тесты** - тестирование отдельных компонентов и функций
- **Integration тесты** - тестирование взаимодействия между компонентами
- **E2E тесты** - тестирование пользовательских сценариев
- **Performance тесты** - тестирование производительности
- **Security тесты** - тестирование безопасности

### Покрытие тестами

- ✅ Авторизация и аутентификация
- ✅ Управление товарами и категориями
- ✅ Прогнозирование спроса
- ✅ Импорт/экспорт данных
- ✅ API интеграции
- ✅ Система уведомлений
- ✅ Отчеты и аналитика

## 🔧 Типы тестов

### Unit тесты

#### Backend (Python/FastAPI)
```bash
# Запуск всех unit тестов backend
pytest tests/unit/backend/ -v

# Запуск с покрытием
pytest tests/unit/backend/ --cov=backend --cov-report=html

# Запуск конкретного теста
pytest tests/unit/backend/test_forecast.py::TestForecastService::test_basic_forecast_calculation
```

**Тестируемые модули:**
- `ForecastService` - прогнозирование спроса
- `SeasonalityService` - обработка сезонности
- `AuthService` - авторизация
- `ProductService` - управление товарами
- `ReportService` - генерация отчетов

#### Frontend (React/TypeScript)
```bash
# Запуск unit тестов frontend
cd frontend && npm test

# Запуск с покрытием
npm test -- --coverage

# Запуск в watch режиме
npm test -- --watch
```

**Тестируемые компоненты:**
- `ForecastEngine` - движок прогнозирования
- `SeasonalityTemplates` - шаблоны сезонности
- `SalesChart` - графики продаж
- `ProductForm` - формы товаров
- `AuthForm` - формы авторизации

### Integration тесты

```bash
# Запуск integration тестов
pytest tests/integration/ -v

# Тестирование API
pytest tests/integration/test_api_integration.py

# Тестирование базы данных
pytest tests/integration/test_database.py
```

**Тестируемые интеграции:**
- API endpoints
- База данных PostgreSQL
- Redis кэш
- SalesDrive API
- Email уведомления

### E2E тесты (Playwright)

```bash
# Запуск всех E2E тестов
npx playwright test

# Запуск в headed режиме
npx playwright test --headed

# Запуск конкретного теста
npx playwright test tests/e2e/auth.spec.ts

# Запуск с отладкой
npx playwright test --debug
```

**Тестируемые сценарии:**
- Полный цикл авторизации
- Создание и управление товарами
- Прогнозирование спроса
- Импорт данных
- Экспорт отчетов

## 📝 Тестовые сценарии

### 1. Авторизация в систему

**Цель:** Проверить корректность авторизации пользователей

**Предусловия:**
- Система запущена
- База данных содержит пользователя admin/admin

**Шаги:**
1. Открыть страницу входа
2. Ввести логин: `admin`
3. Ввести пароль: `admin`
4. Нажать кнопку "Войти"

**Ожидаемый результат:**
- Пользователь перенаправлен на главную страницу
- Отображается приветствие
- Доступно меню пользователя

**Тестовые данные:**
```json
{
  "valid_credentials": {
    "username": "admin",
    "password": "admin"
  },
  "invalid_credentials": {
    "username": "wrong",
    "password": "wrong"
  }
}
```

### 2. Импорт данных из SalesDrive API

**Цель:** Проверить корректность импорта данных из внешней системы

**Предусловия:**
- Пользователь авторизован
- Настроены параметры подключения к SalesDrive API

**Шаги:**
1. Перейти в раздел "Импорт данных"
2. Выбрать источник "SalesDrive API"
3. Указать период импорта
4. Запустить импорт

**Ожидаемый результат:**
- Данные успешно импортированы
- Отображается статистика импорта
- Товары добавлены в систему

### 3. Создание категорий и товаров

**Цель:** Проверить функциональность управления товарами

**Предусловия:**
- Пользователь авторизован

**Шаги:**
1. Создать новую категорию "Электроника"
2. Добавить товар "iPhone 15 Pro"
3. Указать характеристики товара
4. Сохранить товар

**Ожидаемый результат:**
- Категория создана
- Товар добавлен в категорию
- Товар отображается в списке

### 4. Настройка шаблонов сезонности

**Цель:** Проверить настройку сезонных коэффициентов

**Предусловия:**
- Пользователь авторизован
- Созданы категории товаров

**Шаги:**
1. Перейти в раздел "Сезонность"
2. Создать шаблон "Зимняя одежда"
3. Настроить коэффициенты по месяцам
4. Применить к категории "Одежда"

**Ожидаемый результат:**
- Шаблон сезонности создан
- Коэффициенты сохранены
- Шаблон применен к категории

### 5. Прогнозирование спроса

**Цель:** Проверить корректность расчета прогноза спроса

**Предусловия:**
- Товары созданы
- Есть история продаж
- Настроена сезонность

**Шаги:**
1. Выбрать товар для прогнозирования
2. Установить период 30 дней
3. Включить сезонность
4. Запустить расчет прогноза

**Ожидаемый результат:**
- Прогноз рассчитан
- Отображается график
- Показаны доверительные интервалы
- Даны рекомендации по заказу

### 6. Экспорт отчетов

**Цель:** Проверить функциональность экспорта данных

**Предусловия:**
- Данные для отчета доступны

**Шаги:**
1. Перейти в раздел "Отчеты"
2. Выбрать тип отчета "Прогноз спроса"
3. Настроить параметры
4. Экспортировать в Excel

**Ожидаемый результат:**
- Файл Excel скачан
- Данные корректно отформатированы
- Все необходимые поля присутствуют

### 7. Система уведомлений

**Цель:** Проверить отправку уведомлений

**Предусловия:**
- Настроены параметры email
- Товары с низким остатком

**Шаги:**
1. Настроить уведомления о низких остатках
2. Установить пороговое значение
3. Дождаться срабатывания уведомления

**Ожидаемый результат:**
- Уведомление отправлено
- Email получен
- Содержимое корректно

## ⚙️ Установка и настройка

### Требования

- Python 3.9+
- Node.js 16+
- PostgreSQL 13+
- Redis 6+
- Docker (опционально)

### Установка зависимостей

```bash
# Backend зависимости
pip install -r requirements-test.txt

# Frontend зависимости
cd frontend
npm install

# Playwright браузеры
npx playwright install
```

### Настройка тестовой среды

```bash
# Создание тестовой базы данных
createdb test_inventory

# Переменные окружения
export TEST_MODE=true
export DATABASE_URL="postgresql://user:pass@localhost:5432/test_inventory"
export REDIS_URL="redis://localhost:6379/1"

# Запуск тестовых сервисов через Docker
docker-compose -f docker-compose.test.yml up -d
```

### Конфигурация тестов

Создайте файл `tests/config.py`:

```python
import os

# Тестовая конфигурация
TEST_CONFIG = {
    "database_url": os.getenv("DATABASE_URL"),
    "redis_url": os.getenv("REDIS_URL"),
    "secret_key": "test_secret_key",
    "test_mode": True,
    "log_level": "DEBUG"
}

# Playwright конфигурация
PLAYWRIGHT_CONFIG = {
    "base_url": "http://localhost:3000",
    "timeout": 30000,
    "headless": True,
    "browser": "chromium"
}
```

## 🚀 Запуск тестов

### Быстрый запуск всех тестов

```bash
# Запуск всех тестов с отчетами
./tests/scripts/run_all_tests.sh

# Только unit тесты
./tests/scripts/run_all_tests.sh --unit

# Только E2E тесты
./tests/scripts/run_all_tests.sh --e2e

# С подробным выводом
./tests/scripts/run_all_tests.sh --verbose
```

### Запуск отдельных типов тестов

```bash
# Unit тесты backend
pytest tests/unit/backend/ -v --cov=backend

# Unit тесты frontend
cd frontend && npm test

# Integration тесты
pytest tests/integration/ -v

# E2E тесты
npx playwright test tests/e2e/

# Performance тесты
pytest tests/performance/ -v
```

### Параметры запуска

| Параметр | Описание |
|----------|----------|
| `-v, --verbose` | Подробный вывод |
| `-s` | Показать print statements |
| `--cov` | Генерировать отчет покрытия |
| `--headed` | Запуск браузера в видимом режиме |
| `--debug` | Режим отладки |
| `--parallel` | Параллельное выполнение |

## 📊 Тестовые данные

### Структура тестовых данных

```
tests/data/
├── products.json          # Товары и категории
├── seasonality.json       # Шаблоны сезонности
├── sales_history.json     # История продаж
├── users.json             # Тестовые пользователи
└── api_responses/         # Мок ответы API
    ├── salesdrive.json
    └── notifications.json
```

### Генерация тестовых данных

```bash
# Генерация синтетических данных продаж
python tests/data/generate_sales_data.py --days 730 --products 100

# Создание тестовых пользователей
python tests/data/create_test_users.py

# Импорт тестовых данных
python tests/data/import_test_data.py
```

### Примеры тестовых данных

#### Товары
```json
{
  "products": [
    {
      "id": 1,
      "name": "iPhone 15 Pro 128GB",
      "sku": "IPHONE15PRO128",
      "category_id": 1,
      "price": 89990,
      "current_stock": 25,
      "min_stock": 5,
      "max_stock": 100
    }
  ]
}
```

#### История продаж
```json
{
  "sales": [
    {
      "date": "2024-01-01",
      "product_id": 1,
      "quantity": 5,
      "price": 89990,
      "is_wholesale": false
    }
  ]
}
```

## 📈 Отчеты и метрики

### Генерация отчетов

```bash
# Сводный отчет всех тестов
./tests/scripts/run_all_tests.sh --report

# Отчет покрытия backend
pytest tests/unit/backend/ --cov=backend --cov-report=html

# Отчет покрытия frontend
cd frontend && npm test -- --coverage

# E2E отчет
npx playwright test --reporter=html
```

### Метрики качества

- **Покрытие кода**: > 80%
- **Время выполнения тестов**: < 10 минут
- **Успешность тестов**: > 95%
- **Производительность**: < 2 секунды на API запрос

### Структура отчетов

```
tests/reports/
├── test-summary.html           # Сводный отчет
├── backend-coverage/           # Покрытие backend
├── frontend-coverage/          # Покрытие frontend
├── e2e-results/               # Результаты E2E
├── performance-results/        # Результаты нагрузочных тестов
└── test-execution.log         # Лог выполнения
```

## 🔧 Устранение неполадок

### Частые проблемы

#### 1. Тесты не запускаются

**Проблема**: `ModuleNotFoundError: No module named 'pytest'`

**Решение**:
```bash
pip install pytest pytest-asyncio pytest-cov
```

#### 2. База данных недоступна

**Проблема**: `Connection refused to PostgreSQL`

**Решение**:
```bash
# Запуск PostgreSQL через Docker
docker run -d --name test-postgres \
  -e POSTGRES_DB=test_inventory \
  -e POSTGRES_USER=test_user \
  -e POSTGRES_PASSWORD=test_pass \
  -p 5432:5432 postgres:13
```

#### 3. Playwright браузеры не установлены

**Проблема**: `Browser not found`

**Решение**:
```bash
npx playwright install
npx playwright install-deps
```

#### 4. E2E тесты падают

**Проблема**: Приложение не отвечает

**Решение**:
```bash
# Проверка статуса приложения
curl http://localhost:3000/health

# Запуск приложения
docker-compose up -d
```

### Отладка тестов

#### Backend тесты
```bash
# Запуск с отладкой
pytest tests/unit/backend/test_forecast.py -v -s --pdb

# Логирование
pytest tests/unit/backend/ --log-cli-level=DEBUG
```

#### E2E тесты
```bash
# Запуск в headed режиме
npx playwright test --headed --slowMo=1000

# Запуск с отладкой
npx playwright test --debug

# Скриншоты при ошибках
npx playwright test --screenshot=only-on-failure
```

### Мониторинг тестов

#### CI/CD интеграция

```yaml
# .github/workflows/tests.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: ./tests/scripts/run_all_tests.sh --report
      - name: Upload reports
        uses: actions/upload-artifact@v3
        with:
          name: test-reports
          path: tests/reports/
```

#### Уведомления о результатах

```bash
# Отправка результатов в Slack
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"Tests completed: 95% passed"}' \
  $SLACK_WEBHOOK_URL
```

## 📚 Дополнительные ресурсы

- [Главная страница проекта](https://github.com/ColinsWey/inventory-system)
- [Pytest документация](https://docs.pytest.org/)
- [Playwright документация](https://playwright.dev/)
- [Jest документация](https://jestjs.io/)
- [Testing Best Practices](https://testingjavascript.com/)

## 🤝 Участие в разработке тестов

### Добавление новых тестов

1. Создайте тест в соответствующей директории
2. Следуйте naming convention: `test_*.py` или `*.spec.ts`
3. Добавьте описательные docstrings
4. Обновите тестовые данные при необходимости
5. Запустите тесты локально
6. Создайте pull request

### Стандарты качества

- Каждый тест должен быть независимым
- Используйте фикстуры для подготовки данных
- Тесты должны быть детерминированными
- Добавляйте комментарии для сложной логики
- Следуйте принципу AAA (Arrange, Act, Assert)

---

**Версия документа**: 1.0.0  
**Последнее обновление**: $(date '+%d.%m.%Y')  
**Автор**: QA Team 