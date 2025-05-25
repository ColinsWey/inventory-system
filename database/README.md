# База данных системы управления товарными остатками

## Обзор

Система использует PostgreSQL 13+ с современным подходом к управлению схемой через миграции. База данных спроектирована для высокой производительности и масштабируемости.

## Архитектура

### Основные принципы
- **UUID как первичные ключи** - для лучшей масштабируемости
- **JSONB для гибких данных** - спецификации товаров, конфигурации
- **Автоматические триггеры** - для обновления статусов и логирования
- **Полнотекстовый поиск** - с использованием pg_trgm
- **Оптимизированные индексы** - для быстрых запросов

### Структура таблиц

#### Пользователи и права доступа
- `users` - пользователи системы с ролевой моделью
- `user_logs` - логи всех действий пользователей

#### Справочники
- `categories` - иерархические категории товаров
- `product_tags` - теги для дополнительной классификации
- `suppliers` - поставщики с рейтингами и условиями

#### Товары и остатки
- `products` - основная информация о товарах
- `product_tag_relations` - связь товаров с тегами (M:N)
- `inventory` - складские остатки по локациям
- `inventory_movements` - история движений товаров

#### Заказы и продажи
- `orders` - заказы клиентов
- `order_items` - позиции заказов
- `sales_forecasts` - прогнозы продаж

#### Прогнозирование
- `forecast_templates` - шаблоны сезонности
- `sales_forecasts` - расчетные прогнозы

#### Система уведомлений
- `alerts` - уведомления о критических событиях

#### Интеграции
- `sync_history` - история синхронизации с внешними системами
- `integration_config` - конфигурации интеграций

## Установка и настройка

### Требования
- PostgreSQL 13+
- Python 3.9+ (для скриптов миграций)
- psycopg2-binary

### Переменные окружения
```bash
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=inventory_system
```

### Инициализация базы данных

1. **Создание базы данных:**
```bash
python database/migrate.py init
```

2. **Применение миграций:**
```bash
python database/migrate.py up
```

3. **Загрузка начальных данных:**
```bash
python database/migrate.py seed
```

4. **Полная установка (все в одном):**
```bash
python database/migrate.py reset
```

### Управление миграциями

```bash
# Статус миграций
python database/migrate.py status

# Применение новых миграций
python database/migrate.py up

# Откат последней миграции
python database/migrate.py down

# Полный сброс БД
python database/migrate.py reset
```

## Схема данных

### Основные типы данных

```sql
-- Роли пользователей
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'operator', 'viewer');

-- Статусы товаров
CREATE TYPE product_status AS ENUM ('active', 'inactive', 'discontinued');

-- Статусы остатков
CREATE TYPE stock_status AS ENUM ('in_stock', 'low_stock', 'out_of_stock', 'reserved');

-- Типы движений
CREATE TYPE movement_type AS ENUM ('in', 'out', 'adjustment', 'transfer', 'return');

-- Статусы заказов
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled');
```

### Ключевые связи

```
users (1) -----> (N) user_logs
users (1) -----> (N) inventory_movements
users (1) -----> (N) orders

categories (1) -----> (N) products
categories (1) -----> (N) categories (self-reference)

suppliers (1) -----> (N) products
suppliers (1) -----> (N) inventory_movements

products (1) -----> (N) inventory
products (1) -----> (N) inventory_movements
products (1) -----> (N) order_items
products (1) -----> (N) sales_forecasts
products (1) -----> (N) alerts
products (N) <----> (N) product_tags

orders (1) -----> (N) order_items

forecast_templates (1) -----> (N) sales_forecasts
```

## Оптимизация производительности

### Индексы

#### Основные индексы
- `products.sku` - уникальный поиск по артикулу
- `products.name` - полнотекстовый поиск (GIN)
- `inventory.product_id, location` - составной уникальный
- `inventory_movements.created_at` - сортировка по дате

#### Составные индексы
- `(product_id, forecast_date)` - для прогнозов
- `(user_id, created_at)` - для логов пользователей
- `(is_read, level)` - для уведомлений

### Триггеры

#### Автоматические обновления
- `update_updated_at_column()` - обновление timestamp
- `update_inventory_status()` - пересчет статуса остатков
- `update_order_total()` - пересчет суммы заказа
- `create_inventory_record()` - создание записи остатков для нового товара
- `log_product_changes()` - логирование изменений товаров

### Рекомендации по производительности

1. **Используйте подготовленные запросы** для часто выполняемых операций
2. **Ограничивайте выборки** с помощью LIMIT и OFFSET
3. **Используйте индексы** для условий WHERE и ORDER BY
4. **Кешируйте** результаты тяжелых запросов
5. **Мониторьте** медленные запросы через pg_stat_statements

## Безопасность

### Права доступа
- Создайте отдельного пользователя для приложения
- Ограничьте права только необходимыми таблицами
- Используйте SSL соединения в продакшене

### Резервное копирование
```bash
# Создание бэкапа
pg_dump -h localhost -U postgres inventory_system > backup.sql

# Восстановление
psql -h localhost -U postgres inventory_system < backup.sql
```

## Мониторинг

### Полезные запросы

#### Статистика по таблицам
```sql
SELECT 
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes
FROM pg_stat_user_tables
ORDER BY n_tup_ins + n_tup_upd + n_tup_del DESC;
```

#### Размеры таблиц
```sql
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size(tablename::regclass)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(tablename::regclass) DESC;
```

#### Медленные запросы
```sql
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

## Начальные данные

После выполнения `migrate.py seed` в системе будут созданы:

### Пользователи
- **admin/admin** - администратор системы
- **manager/admin** - менеджер склада

### Тестовые данные
- 5 категорий товаров с подкатегориями
- 5 тегов товаров с цветовой кодировкой
- 3 поставщика с контактной информацией
- 5 товаров с остатками и движениями
- 2 тестовых заказа
- Шаблоны прогнозирования
- Конфигурации интеграций

## Troubleshooting

### Частые проблемы

1. **Ошибка подключения**
   - Проверьте переменные окружения
   - Убедитесь, что PostgreSQL запущен
   - Проверьте права доступа

2. **Ошибка миграций**
   - Проверьте синтаксис SQL
   - Убедитесь в правильном порядке миграций
   - Проверьте зависимости между таблицами

3. **Медленные запросы**
   - Проанализируйте план выполнения (EXPLAIN)
   - Добавьте недостающие индексы
   - Оптимизируйте условия WHERE

### Логи
```bash
# Включение логирования медленных запросов
ALTER SYSTEM SET log_min_duration_statement = 1000;
SELECT pg_reload_conf();
``` 