-- Инициализация базы данных для системы управления товарными остатками

-- Создание базы данных
CREATE DATABASE IF NOT EXISTS inventory_system;
USE inventory_system;

-- Таблица пользователей
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица категорий товаров
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица поставщиков
CREATE TABLE suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица товарных остатков
CREATE TABLE inventory_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) UNIQUE NOT NULL,
    category_id INTEGER REFERENCES categories(id),
    supplier_id INTEGER REFERENCES suppliers(id),
    description TEXT,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    quantity INTEGER NOT NULL DEFAULT 0,
    min_quantity INTEGER NOT NULL DEFAULT 0,
    max_quantity INTEGER,
    location VARCHAR(100),
    status VARCHAR(20) DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'low_stock', 'out_of_stock', 'discontinued')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица движения товаров
CREATE TABLE inventory_movements (
    id SERIAL PRIMARY KEY,
    item_id INTEGER REFERENCES inventory_items(id),
    movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment')),
    quantity INTEGER NOT NULL,
    reason VARCHAR(255),
    reference_number VARCHAR(100),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица истории синхронизации
CREATE TABLE sync_history (
    id SERIAL PRIMARY KEY,
    sync_type VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('running', 'success', 'error', 'partial')),
    items_processed INTEGER DEFAULT 0,
    items_updated INTEGER DEFAULT 0,
    items_created INTEGER DEFAULT 0,
    items_failed INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    details JSONB
);

-- Таблица уведомлений
CREATE TABLE alerts (
    id SERIAL PRIMARY KEY,
    item_id INTEGER REFERENCES inventory_items(id),
    alert_type VARCHAR(50) NOT NULL,
    level VARCHAR(20) NOT NULL CHECK (level IN ('info', 'warning', 'critical')),
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица конфигурации интеграции
CREATE TABLE integration_config (
    id SERIAL PRIMARY KEY,
    service_name VARCHAR(50) NOT NULL,
    config_data JSONB NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для оптимизации
CREATE INDEX idx_inventory_items_sku ON inventory_items(sku);
CREATE INDEX idx_inventory_items_category ON inventory_items(category_id);
CREATE INDEX idx_inventory_items_status ON inventory_items(status);
CREATE INDEX idx_inventory_movements_item ON inventory_movements(item_id);
CREATE INDEX idx_inventory_movements_type ON inventory_movements(movement_type);
CREATE INDEX idx_alerts_item ON alerts(item_id);
CREATE INDEX idx_alerts_read ON alerts(is_read);

-- Триггеры для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON inventory_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Триггер для автоматического обновления статуса товара
CREATE OR REPLACE FUNCTION update_inventory_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.quantity = 0 THEN
        NEW.status = 'out_of_stock';
    ELSIF NEW.quantity <= NEW.min_quantity THEN
        NEW.status = 'low_stock';
    ELSE
        NEW.status = 'in_stock';
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_inventory_status_trigger BEFORE INSERT OR UPDATE ON inventory_items
    FOR EACH ROW EXECUTE FUNCTION update_inventory_status();

-- Вставка начальных данных
INSERT INTO users (username, email, hashed_password) VALUES 
('admin', 'admin@example.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW'); -- пароль: admin

INSERT INTO categories (name, description) VALUES 
('Категория А', 'Основные товары'),
('Категория Б', 'Дополнительные товары'),
('Категория В', 'Сезонные товары');

INSERT INTO suppliers (name, contact_person, email, phone) VALUES 
('Поставщик 1', 'Иван Иванов', 'ivan@supplier1.com', '+7-123-456-7890'),
('Поставщик 2', 'Петр Петров', 'petr@supplier2.com', '+7-123-456-7891'),
('Поставщик 3', 'Сидор Сидоров', 'sidor@supplier3.com', '+7-123-456-7892');

INSERT INTO integration_config (service_name, config_data, is_enabled) VALUES 
('salesdrive', '{"api_url": "https://api.salesdrive.ru", "sync_interval": 60, "auto_sync": true}', true); 