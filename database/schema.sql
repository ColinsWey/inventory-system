-- Полная схема базы данных для системы управления товарными остатками
-- PostgreSQL 13+

-- Создание расширений
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Создание типов данных
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'operator', 'viewer');
CREATE TYPE product_status AS ENUM ('active', 'inactive', 'discontinued');
CREATE TYPE stock_status AS ENUM ('in_stock', 'low_stock', 'out_of_stock', 'reserved');
CREATE TYPE movement_type AS ENUM ('in', 'out', 'adjustment', 'transfer', 'return');
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled');
CREATE TYPE alert_level AS ENUM ('info', 'warning', 'critical');
CREATE TYPE sync_status AS ENUM ('idle', 'running', 'success', 'error', 'partial');

-- 1. Таблица пользователей
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role user_role DEFAULT 'viewer',
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Таблица основных категорий
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES categories(id),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Таблица дополнительных категорий (теги)
CREATE TABLE product_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    color VARCHAR(7) DEFAULT '#6B7280', -- HEX цвет
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Таблица поставщиков
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE,
    contact_person VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Россия',
    tax_id VARCHAR(50),
    payment_terms INTEGER DEFAULT 30, -- дни
    is_active BOOLEAN DEFAULT TRUE,
    rating DECIMAL(3,2) DEFAULT 5.00,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Таблица товаров (переименовано из inventory_items)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) UNIQUE NOT NULL,
    barcode VARCHAR(100),
    category_id UUID REFERENCES categories(id),
    supplier_id UUID REFERENCES suppliers(id),
    description TEXT,
    specifications JSONB,
    unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    cost_price DECIMAL(12,2) DEFAULT 0,
    weight DECIMAL(8,3), -- кг
    dimensions JSONB, -- {"length": 10, "width": 5, "height": 3}
    unit_of_measure VARCHAR(20) DEFAULT 'шт',
    status product_status DEFAULT 'active',
    is_serialized BOOLEAN DEFAULT FALSE,
    warranty_months INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Связь товаров с тегами (многие ко многим)
CREATE TABLE product_tag_relations (
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES product_tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (product_id, tag_id)
);

-- 7. Таблица складских остатков
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    location VARCHAR(100) DEFAULT 'Основной склад',
    quantity INTEGER NOT NULL DEFAULT 0,
    reserved_quantity INTEGER DEFAULT 0,
    min_quantity INTEGER NOT NULL DEFAULT 0,
    max_quantity INTEGER,
    reorder_point INTEGER,
    stock_status stock_status DEFAULT 'in_stock',
    last_counted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, location)
);

-- 8. Таблица движений товаров
CREATE TABLE inventory_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id),
    location VARCHAR(100),
    movement_type movement_type NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(12,2),
    total_amount DECIMAL(12,2),
    reason VARCHAR(255),
    reference_number VARCHAR(100),
    document_number VARCHAR(100),
    supplier_id UUID REFERENCES suppliers(id),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Таблица заявок/заказов
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(100) UNIQUE NOT NULL,
    customer_name VARCHAR(255),
    customer_email VARCHAR(100),
    customer_phone VARCHAR(20),
    customer_address TEXT,
    status order_status DEFAULT 'pending',
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    required_date TIMESTAMP,
    shipped_date TIMESTAMP,
    delivered_date TIMESTAMP,
    total_amount DECIMAL(12,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Позиции заказов
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. Шаблоны сезонности для прогнозирования
CREATE TABLE forecast_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category_id UUID REFERENCES categories(id),
    seasonal_factors JSONB NOT NULL, -- {"1": 1.2, "2": 0.8, ...} по месяцам
    trend_factor DECIMAL(5,4) DEFAULT 1.0000,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. Прогнозы продаж
CREATE TABLE sales_forecasts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id),
    forecast_date DATE NOT NULL,
    predicted_quantity INTEGER NOT NULL,
    confidence_level DECIMAL(5,2) DEFAULT 0.80,
    template_id UUID REFERENCES forecast_templates(id),
    actual_quantity INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, forecast_date)
);

-- 13. Логи действий пользователей
CREATE TABLE user_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50), -- 'product', 'order', 'inventory'
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14. Уведомления
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id),
    alert_type VARCHAR(50) NOT NULL,
    level alert_level NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 15. История синхронизации
CREATE TABLE sync_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sync_type VARCHAR(50) NOT NULL,
    status sync_status NOT NULL,
    items_processed INTEGER DEFAULT 0,
    items_updated INTEGER DEFAULT 0,
    items_created INTEGER DEFAULT 0,
    items_failed INTEGER DEFAULT 0,
    error_message TEXT,
    details JSONB,
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

-- 16. Конфигурация интеграций
CREATE TABLE integration_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_name VARCHAR(50) NOT NULL UNIQUE,
    config_data JSONB NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    last_sync TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание индексов для оптимизации
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_supplier ON products(supplier_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_name_trgm ON products USING gin(name gin_trgm_ops);

CREATE INDEX idx_inventory_product ON inventory(product_id);
CREATE INDEX idx_inventory_location ON inventory(location);
CREATE INDEX idx_inventory_status ON inventory(stock_status);
CREATE INDEX idx_inventory_quantity ON inventory(quantity);

CREATE INDEX idx_movements_product ON inventory_movements(product_id);
CREATE INDEX idx_movements_type ON inventory_movements(movement_type);
CREATE INDEX idx_movements_date ON inventory_movements(created_at);
CREATE INDEX idx_movements_reference ON inventory_movements(reference_number);

CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_date ON orders(order_date);
CREATE INDEX idx_orders_customer ON orders(customer_email);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);

CREATE INDEX idx_forecasts_product_date ON sales_forecasts(product_id, forecast_date);
CREATE INDEX idx_forecasts_date ON sales_forecasts(forecast_date);

CREATE INDEX idx_user_logs_user ON user_logs(user_id);
CREATE INDEX idx_user_logs_action ON user_logs(action);
CREATE INDEX idx_user_logs_entity ON user_logs(entity_type, entity_id);
CREATE INDEX idx_user_logs_date ON user_logs(created_at);

CREATE INDEX idx_alerts_product ON alerts(product_id);
CREATE INDEX idx_alerts_read ON alerts(is_read);
CREATE INDEX idx_alerts_level ON alerts(level);

CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_active ON categories(is_active);

-- Функции и триггеры
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_tags_updated_at BEFORE UPDATE ON product_tags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_forecast_templates_updated_at BEFORE UPDATE ON forecast_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integration_config_updated_at BEFORE UPDATE ON integration_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Функция автоматического обновления статуса остатков
CREATE OR REPLACE FUNCTION update_inventory_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.quantity = 0 THEN
        NEW.stock_status = 'out_of_stock';
    ELSIF NEW.quantity <= NEW.min_quantity THEN
        NEW.stock_status = 'low_stock';
    ELSE
        NEW.stock_status = 'in_stock';
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_inventory_status_trigger BEFORE INSERT OR UPDATE ON inventory
    FOR EACH ROW EXECUTE FUNCTION update_inventory_status();

-- Функция логирования изменений товаров
CREATE OR REPLACE FUNCTION log_product_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO user_logs (user_id, action, entity_type, entity_id, old_values, new_values)
        VALUES (
            COALESCE(current_setting('app.current_user_id', true)::UUID, NULL),
            'UPDATE',
            'product',
            NEW.id,
            to_jsonb(OLD),
            to_jsonb(NEW)
        );
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO user_logs (user_id, action, entity_type, entity_id, new_values)
        VALUES (
            COALESCE(current_setting('app.current_user_id', true)::UUID, NULL),
            'CREATE',
            'product',
            NEW.id,
            to_jsonb(NEW)
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO user_logs (user_id, action, entity_type, entity_id, old_values)
        VALUES (
            COALESCE(current_setting('app.current_user_id', true)::UUID, NULL),
            'DELETE',
            'product',
            OLD.id,
            to_jsonb(OLD)
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER log_product_changes_trigger
    AFTER INSERT OR UPDATE OR DELETE ON products
    FOR EACH ROW EXECUTE FUNCTION log_product_changes();

-- Функция автоматического создания записи в inventory при создании товара
CREATE OR REPLACE FUNCTION create_inventory_record()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO inventory (product_id, location, quantity, min_quantity)
    VALUES (NEW.id, 'Основной склад', 0, 0);
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER create_inventory_record_trigger
    AFTER INSERT ON products
    FOR EACH ROW EXECUTE FUNCTION create_inventory_record();

-- Функция обновления общей суммы заказа
CREATE OR REPLACE FUNCTION update_order_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE orders 
    SET total_amount = (
        SELECT COALESCE(SUM(total_amount), 0) 
        FROM order_items 
        WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
    )
    WHERE id = COALESCE(NEW.order_id, OLD.order_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

CREATE TRIGGER update_order_total_trigger
    AFTER INSERT OR UPDATE OR DELETE ON order_items
    FOR EACH ROW EXECUTE FUNCTION update_order_total(); 