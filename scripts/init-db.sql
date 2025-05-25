-- =============================================================================
-- ИНИЦИАЛИЗАЦИЯ БАЗЫ ДАННЫХ СИСТЕМЫ УПРАВЛЕНИЯ ТОВАРНЫМИ ОСТАТКАМИ
-- =============================================================================
-- Создание базовых таблиц и начальных данных

-- Включение расширений PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =============================================================================
-- ТАБЛИЦА ПОЛЬЗОВАТЕЛЕЙ
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'user')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для пользователей
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- =============================================================================
-- ТАБЛИЦА КАТЕГОРИЙ
-- =============================================================================

CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для категорий
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);

-- =============================================================================
-- ТАБЛИЦА ТОВАРОВ
-- =============================================================================

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    sku VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    cost_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    unit_of_measure VARCHAR(20) DEFAULT 'шт',
    min_stock_level INTEGER DEFAULT 0,
    max_stock_level INTEGER DEFAULT 1000,
    current_stock INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'discontinued')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для товаров
CREATE INDEX IF NOT EXISTS idx_products_name ON products USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_current_stock ON products(current_stock);

-- =============================================================================
-- ТАБЛИЦА ДВИЖЕНИЯ ТОВАРОВ
-- =============================================================================

CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment')),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2),
    total_amount DECIMAL(10,2),
    reason VARCHAR(100),
    reference_number VARCHAR(50),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для движения товаров
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_movements_user_id ON stock_movements(user_id);

-- =============================================================================
-- ТАБЛИЦА ПРОДАЖ
-- =============================================================================

CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    sale_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    customer_name VARCHAR(100),
    is_wholesale BOOLEAN DEFAULT false,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для продаж
CREATE INDEX IF NOT EXISTS idx_sales_product_id ON sales(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_is_wholesale ON sales(is_wholesale);
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);

-- =============================================================================
-- ТАБЛИЦА ИЗМЕНЕНИЙ ЦЕН
-- =============================================================================

CREATE TABLE IF NOT EXISTS price_changes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    old_price DECIMAL(10,2) NOT NULL,
    new_price DECIMAL(10,2) NOT NULL,
    reason VARCHAR(200),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для изменений цен
CREATE INDEX IF NOT EXISTS idx_price_changes_product_id ON price_changes(product_id);
CREATE INDEX IF NOT EXISTS idx_price_changes_created_at ON price_changes(created_at);

-- =============================================================================
-- ТАБЛИЦА ЛОГОВ СИСТЕМЫ
-- =============================================================================

CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    level VARCHAR(10) NOT NULL CHECK (level IN ('DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL')),
    message TEXT NOT NULL,
    module VARCHAR(50),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для логов
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_system_logs_module ON system_logs(module);

-- =============================================================================
-- ТРИГГЕРЫ ДЛЯ АВТОМАТИЧЕСКОГО ОБНОВЛЕНИЯ UPDATED_AT
-- =============================================================================

-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для таблиц
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at 
    BEFORE UPDATE ON categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON products 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ТРИГГЕР ДЛЯ АВТОМАТИЧЕСКОГО ОБНОВЛЕНИЯ ОСТАТКОВ
-- =============================================================================

-- Функция для обновления остатков товаров
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.movement_type = 'in' THEN
        UPDATE products 
        SET current_stock = current_stock + NEW.quantity,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.product_id;
    ELSIF NEW.movement_type = 'out' THEN
        UPDATE products 
        SET current_stock = current_stock - NEW.quantity,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.product_id;
    ELSIF NEW.movement_type = 'adjustment' THEN
        UPDATE products 
        SET current_stock = NEW.quantity,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.product_id;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для обновления остатков
CREATE TRIGGER update_stock_on_movement 
    AFTER INSERT ON stock_movements 
    FOR EACH ROW EXECUTE FUNCTION update_product_stock();

-- =============================================================================
-- ТРИГГЕР ДЛЯ АВТОМАТИЧЕСКОГО СОЗДАНИЯ ДВИЖЕНИЯ ПРИ ПРОДАЖЕ
-- =============================================================================

-- Функция для создания движения при продаже
CREATE OR REPLACE FUNCTION create_stock_movement_on_sale()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO stock_movements (
        product_id,
        movement_type,
        quantity,
        unit_price,
        total_amount,
        reason,
        reference_number,
        user_id
    ) VALUES (
        NEW.product_id,
        'out',
        NEW.quantity,
        NEW.unit_price,
        NEW.total_amount,
        'Продажа',
        'SALE-' || NEW.id,
        NEW.user_id
    );
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для создания движения при продаже
CREATE TRIGGER create_movement_on_sale 
    AFTER INSERT ON sales 
    FOR EACH ROW EXECUTE FUNCTION create_stock_movement_on_sale();

-- =============================================================================
-- НАЧАЛЬНЫЕ ДАННЫЕ
-- =============================================================================

-- Создание администратора по умолчанию
-- Пароль: admin (хеш для bcrypt)
INSERT INTO users (username, email, password_hash, role) 
VALUES (
    'admin', 
    'admin@inventory.local', 
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PmvlG2', 
    'admin'
) ON CONFLICT (username) DO NOTHING;

-- Создание базовых категорий
INSERT INTO categories (name, description) VALUES 
    ('Электроника', 'Электронные устройства и компоненты'),
    ('Одежда', 'Одежда и аксессуары'),
    ('Спорттовары', 'Товары для спорта и активного отдыха'),
    ('Книги', 'Книги и печатные издания'),
    ('Дом и сад', 'Товары для дома и сада')
ON CONFLICT DO NOTHING;

-- Создание подкатегорий для электроники
INSERT INTO categories (name, description, parent_id) 
SELECT 'Смартфоны', 'Мобильные телефоны', id FROM categories WHERE name = 'Электроника'
ON CONFLICT DO NOTHING;

INSERT INTO categories (name, description, parent_id) 
SELECT 'Ноутбуки', 'Портативные компьютеры', id FROM categories WHERE name = 'Электроника'
ON CONFLICT DO NOTHING;

INSERT INTO categories (name, description, parent_id) 
SELECT 'Аксессуары', 'Аксессуары для электроники', id FROM categories WHERE name = 'Электроника'
ON CONFLICT DO NOTHING;

-- Создание демонстрационных товаров
INSERT INTO products (name, sku, description, category_id, unit_price, cost_price, min_stock_level, max_stock_level, current_stock)
SELECT 
    'iPhone 15 Pro', 
    'IPH15PRO', 
    'Флагманский смартфон Apple с чипом A17 Pro',
    c.id,
    89990.00,
    65000.00,
    10,
    100,
    25
FROM categories c WHERE c.name = 'Смартфоны'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO products (name, sku, description, category_id, unit_price, cost_price, min_stock_level, max_stock_level, current_stock)
SELECT 
    'MacBook Pro 14"', 
    'MBP14', 
    'Профессиональный ноутбук Apple с чипом M3 Pro',
    c.id,
    199990.00,
    150000.00,
    5,
    50,
    12
FROM categories c WHERE c.name = 'Ноутбуки'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO products (name, sku, description, category_id, unit_price, cost_price, min_stock_level, max_stock_level, current_stock)
SELECT 
    'AirPods Pro 2', 
    'APP2', 
    'Беспроводные наушники с активным шумоподавлением',
    c.id,
    24990.00,
    18000.00,
    20,
    200,
    45
FROM categories c WHERE c.name = 'Аксессуары'
ON CONFLICT (sku) DO NOTHING;

-- =============================================================================
-- ПРЕДСТАВЛЕНИЯ ДЛЯ АНАЛИТИКИ
-- =============================================================================

-- Представление для анализа остатков
CREATE OR REPLACE VIEW stock_analysis AS
SELECT 
    p.id,
    p.name,
    p.sku,
    p.current_stock,
    p.min_stock_level,
    p.max_stock_level,
    c.name as category_name,
    CASE 
        WHEN p.current_stock = 0 THEN 'critical'
        WHEN p.current_stock <= p.min_stock_level THEN 'low'
        WHEN p.current_stock >= p.max_stock_level THEN 'excess'
        ELSE 'normal'
    END as stock_status,
    p.unit_price,
    p.current_stock * p.unit_price as stock_value
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.status = 'active';

-- Представление для анализа продаж
CREATE OR REPLACE VIEW sales_analysis AS
SELECT 
    p.id as product_id,
    p.name as product_name,
    p.sku,
    c.name as category_name,
    DATE_TRUNC('day', s.sale_date) as sale_date,
    SUM(s.quantity) as total_quantity,
    SUM(s.total_amount) as total_revenue,
    AVG(s.unit_price) as avg_price,
    COUNT(*) as transaction_count
FROM sales s
JOIN products p ON s.product_id = p.id
LEFT JOIN categories c ON p.category_id = c.id
GROUP BY p.id, p.name, p.sku, c.name, DATE_TRUNC('day', s.sale_date);

-- =============================================================================
-- ФУНКЦИИ ДЛЯ РАБОТЫ С ДАННЫМИ
-- =============================================================================

-- Функция для получения истории движения товара
CREATE OR REPLACE FUNCTION get_product_movement_history(product_uuid UUID, days_back INTEGER DEFAULT 30)
RETURNS TABLE (
    movement_date TIMESTAMP WITH TIME ZONE,
    movement_type VARCHAR(20),
    quantity INTEGER,
    unit_price DECIMAL(10,2),
    reason VARCHAR(100),
    username VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sm.created_at,
        sm.movement_type,
        sm.quantity,
        sm.unit_price,
        sm.reason,
        u.username
    FROM stock_movements sm
    LEFT JOIN users u ON sm.user_id = u.id
    WHERE sm.product_id = product_uuid
    AND sm.created_at >= CURRENT_TIMESTAMP - INTERVAL '%s days' % days_back
    ORDER BY sm.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Функция для получения топ продаж
CREATE OR REPLACE FUNCTION get_top_selling_products(days_back INTEGER DEFAULT 30, limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    product_id UUID,
    product_name VARCHAR(200),
    sku VARCHAR(50),
    total_quantity BIGINT,
    total_revenue NUMERIC,
    transaction_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.sku,
        SUM(s.quantity)::BIGINT,
        SUM(s.total_amount),
        COUNT(*)::BIGINT
    FROM sales s
    JOIN products p ON s.product_id = p.id
    WHERE s.sale_date >= CURRENT_TIMESTAMP - INTERVAL '%s days' % days_back
    GROUP BY p.id, p.name, p.sku
    ORDER BY SUM(s.total_amount) DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- ЗАВЕРШЕНИЕ ИНИЦИАЛИЗАЦИИ
-- =============================================================================

-- Обновление статистики для оптимизатора запросов
ANALYZE;

-- Вывод информации о созданных объектах
DO $$
DECLARE
    table_count INTEGER;
    index_count INTEGER;
    trigger_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count FROM information_schema.tables WHERE table_schema = 'public';
    SELECT COUNT(*) INTO index_count FROM pg_indexes WHERE schemaname = 'public';
    SELECT COUNT(*) INTO trigger_count FROM information_schema.triggers WHERE trigger_schema = 'public';
    
    RAISE NOTICE 'База данных успешно инициализирована!';
    RAISE NOTICE 'Создано таблиц: %', table_count;
    RAISE NOTICE 'Создано индексов: %', index_count;
    RAISE NOTICE 'Создано триггеров: %', trigger_count;
    RAISE NOTICE 'Пользователь по умолчанию: admin/admin';
END $$; 