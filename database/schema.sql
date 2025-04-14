-- Enable extensions if needed (e.g., for UUIDs if preferred over SERIAL)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Categories for Products
CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Suppliers
CREATE TABLE suppliers (
    supplier_id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    contact_person VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(20),
    address TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Warehouses/Storage Locations
CREATE TABLE warehouses (
    warehouse_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    location_address TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Products
CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    sku VARCHAR(50) NOT NULL UNIQUE, -- Stock Keeping Unit
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category_id INT REFERENCES categories(category_id) ON DELETE SET NULL,
    supplier_id INT REFERENCES suppliers(supplier_id) ON DELETE SET NULL, -- Default/preferred supplier
    unit_of_measure VARCHAR(20) NOT NULL, -- e.g., 'kg', 'liter', 'pcs', 'pack'
    purchase_price NUMERIC(10, 2) DEFAULT 0.00, -- Cost price
    selling_price NUMERIC(10, 2) DEFAULT 0.00,
    reorder_level NUMERIC(10, 3) DEFAULT 0, -- Threshold to trigger reorder
    target_stock_level NUMERIC(10, 3) DEFAULT 0, -- Ideal stock level
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
-- Add indexes for frequent lookups
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_supplier_id ON products(supplier_id);

-- 5. Inventory (Actual Stock Levels)
-- This table holds the current quantity of each product in each warehouse.
CREATE TABLE inventory (
    inventory_id BIGSERIAL PRIMARY KEY,
    product_id INT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    warehouse_id INT NOT NULL REFERENCES warehouses(warehouse_id) ON DELETE CASCADE,
    quantity_on_hand NUMERIC(10, 3) NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
    last_updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    -- Ensure only one entry per product per warehouse
    CONSTRAINT unique_product_warehouse UNIQUE (product_id, warehouse_id)
);
-- Add indexes for performance
CREATE INDEX idx_inventory_product_id ON inventory(product_id);
CREATE INDEX idx_inventory_warehouse_id ON inventory(warehouse_id);

-- 6. Stock Movements (Audit Trail)
-- This is crucial for tracking *why* inventory levels changed.
CREATE TABLE stock_movements (
    movement_id BIGSERIAL PRIMARY KEY,
    product_id INT NOT NULL REFERENCES products(product_id) ON DELETE RESTRICT,
    warehouse_id INT NOT NULL REFERENCES warehouses(warehouse_id) ON DELETE RESTRICT,
    movement_type VARCHAR(50) NOT NULL, -- e.g., 'Purchase Receipt', 'Sale', 'Adjustment_Damage', 'Adjustment_Shrinkage', 'Transfer_Out', 'Transfer_In', 'Initial Stock'
    quantity_change NUMERIC(10, 3) NOT NULL, -- Positive for increase, negative for decrease
    movement_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    reference_id VARCHAR(100), -- Optional: Link to PO, Sales Order, Adjustment ID, Transfer ID etc.
    notes TEXT,
    user_id INT -- Optional: Link to a users table if you have one
);
-- Add indexes
CREATE INDEX idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_warehouse_id ON stock_movements(warehouse_id);
CREATE INDEX idx_stock_movements_movement_date ON stock_movements(movement_date);
CREATE INDEX idx_stock_movements_movement_type ON stock_movements(movement_type);

-- 7. Purchase Orders
CREATE TABLE purchase_orders (
    po_id SERIAL PRIMARY KEY,
    supplier_id INT NOT NULL REFERENCES suppliers(supplier_id) ON DELETE RESTRICT,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending', -- e.g., 'Pending', 'Ordered', 'Partially Received', 'Received', 'Cancelled'
    total_amount NUMERIC(12, 2), -- Can be calculated or stored
    notes TEXT,
    created_by_user_id INT, -- Optional user link
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);

-- 8. Purchase Order Items
CREATE TABLE purchase_order_items (
    po_item_id SERIAL PRIMARY KEY,
    po_id INT NOT NULL REFERENCES purchase_orders(po_id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES products(product_id) ON DELETE RESTRICT,
    quantity_ordered NUMERIC(10, 3) NOT NULL CHECK (quantity_ordered > 0),
    unit_price NUMERIC(10, 2) NOT NULL, -- Price at the time of order
    quantity_received NUMERIC(10, 3) DEFAULT 0 CHECK (quantity_received >= 0),
    CONSTRAINT unique_po_product UNIQUE (po_id, product_id)
);
CREATE INDEX idx_po_items_po_id ON purchase_order_items(po_id);
CREATE INDEX idx_po_items_product_id ON purchase_order_items(product_id);

-- (Optional) Stock Transfers (if moving between warehouses)
CREATE TABLE stock_transfers (
    transfer_id SERIAL PRIMARY KEY,
    from_warehouse_id INT NOT NULL REFERENCES warehouses(warehouse_id) ON DELETE RESTRICT,
    to_warehouse_id INT NOT NULL REFERENCES warehouses(warehouse_id) ON DELETE RESTRICT,
    transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending', -- 'Pending', 'Shipped', 'Received'
    notes TEXT,
    initiated_by_user_id INT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_different_warehouses CHECK (from_warehouse_id <> to_warehouse_id)
);

CREATE TABLE stock_transfer_items (
    transfer_item_id SERIAL PRIMARY KEY,
    transfer_id INT NOT NULL REFERENCES stock_transfers(transfer_id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES products(product_id) ON DELETE RESTRICT,
    quantity NUMERIC(10, 3) NOT NULL CHECK (quantity > 0)
);
CREATE INDEX idx_transfer_items_transfer_id ON stock_transfer_items(transfer_id);
CREATE INDEX idx_transfer_items_product_id ON stock_transfer_items(product_id);

-- (Optional) Users Table (for auditing)
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(100),
    role VARCHAR(50), -- e.g., 'Admin', 'Warehouse Staff', 'Purchasing'
    password_hash VARCHAR(255), -- Store hashed passwords only!
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);