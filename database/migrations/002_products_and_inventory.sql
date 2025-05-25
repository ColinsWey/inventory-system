-- Миграция 002: Товары и складские остатки
-- Дата: 2024-01-15
-- Описание: Создание таблиц товаров, остатков и движений

-- Таблица товаров
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
    weight DECIMAL(8,3),
    dimensions JSONB,
    unit_of_measure VARCHAR(20) DEFAULT 'шт',
    status product_status DEFAULT 'active',
    is_serialized BOOLEAN DEFAULT FALSE,
    warranty_months INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Связь товаров с тегами
CREATE TABLE product_tag_relations (
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES product_tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (product_id, tag_id)
);

-- Таблица складских остатков
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

-- Таблица движений товаров
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

-- Индексы для товаров
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_supplier ON products(supplier_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_name_trgm ON products USING gin(name gin_trgm_ops);

-- Индексы для остатков
CREATE INDEX idx_inventory_product ON inventory(product_id);
CREATE INDEX idx_inventory_location ON inventory(location);
CREATE INDEX idx_inventory_status ON inventory(stock_status);
CREATE INDEX idx_inventory_quantity ON inventory(quantity);

-- Индексы для движений
CREATE INDEX idx_movements_product ON inventory_movements(product_id);
CREATE INDEX idx_movements_type ON inventory_movements(movement_type);
CREATE INDEX idx_movements_date ON inventory_movements(created_at);
CREATE INDEX idx_movements_reference ON inventory_movements(reference_number);

-- Триггеры для updated_at
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory
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