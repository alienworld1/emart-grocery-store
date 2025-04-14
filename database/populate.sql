-- Wrap in a transaction to ensure all or nothing
BEGIN;

-- Clear existing data (optional, use with caution in non-dev environments!)
DELETE FROM stock_movements;
DELETE FROM inventory;
DELETE FROM purchase_order_items;
DELETE FROM purchase_orders;
DELETE FROM products;
DELETE FROM categories;
DELETE FROM suppliers;
DELETE FROM warehouses;
DELETE FROM users;
DELETE FROM stock_transfer_items;
DELETE FROM stock_transfers;

-- Reset sequences (optional, careful!)
ALTER SEQUENCE categories_category_id_seq RESTART WITH 1;
ALTER SEQUENCE suppliers_supplier_id_seq RESTART WITH 1;
ALTER SEQUENCE warehouses_warehouse_id_seq RESTART WITH 1;
ALTER SEQUENCE products_product_id_seq RESTART WITH 1;
ALTER SEQUENCE inventory_inventory_id_seq RESTART WITH 1;
ALTER SEQUENCE stock_movements_movement_id_seq RESTART WITH 1;
ALTER SEQUENCE purchase_orders_po_id_seq RESTART WITH 1;
ALTER SEQUENCE purchase_order_items_po_item_id_seq RESTART WITH 1;
ALTER SEQUENCE users_user_id_seq RESTART WITH 1;
ALTER SEQUENCE stock_transfers_transfer_id_seq RESTART WITH 1;
ALTER SEQUENCE stock_transfer_items_transfer_item_id_seq RESTART WITH 1;


-- 1. Populate Users (Assuming user_id 1, 2, 3)
INSERT INTO users (username, full_name, role, password_hash) VALUES
('admin', 'Admin User', 'Admin', 'hashed_password_placeholder_1'), -- Replace with actual hash
('sam_w', 'Sam Warehouse', 'Warehouse Staff', 'hashed_password_placeholder_2'),
('pam_p', 'Pam Purchasing', 'Purchasing', 'hashed_password_placeholder_3');

-- 2. Populate Categories (Assuming category_id 1, 2, 3, 4, 5)
INSERT INTO categories (name, description) VALUES
('Fresh Produce', 'Fruits and vegetables'),
('Dairy & Eggs', 'Milk, cheese, eggs, yogurt'),
('Bakery', 'Bread, pastries, cakes'),
('Pantry Staples', 'Rice, pasta, canned goods, spices'),
('Beverages', 'Juices, soda, water, coffee, tea');

-- 3. Populate Suppliers (Assuming supplier_id 1, 2, 3)
INSERT INTO suppliers (name, contact_person, email, phone, address) VALUES
('FreshFarm Distributors', 'Alice Green', 'alice@freshfarm.com', '555-0101', '1 Farm Road'),
('DairyDelight Inc.', 'Bob White', 'bob@dairydelight.com', '555-0102', '2 Milk Lane'),
('General Groceries Co.', 'Charlie Brown', 'charlie@ggc.com', '555-0103', '3 Supply Street');

-- 4. Populate Warehouses (Assuming warehouse_id 1, 2)
INSERT INTO warehouses (name, location_address) VALUES
('Main Warehouse', '100 eMart Way, Central City'),
('Cold Storage Unit A', '105 eMart Way, Cold Section');

-- SELECT * FROM categories;

-- 5. Populate Products (Linking to categories and suppliers)
-- Assume product_id 1 through 8
INSERT INTO products (sku, name, description, category_id, supplier_id, unit_of_measure, purchase_price, selling_price, reorder_level, target_stock_level) VALUES
('FRU-APP-01', 'Organic Apples', 'Crisp Gala Apples', 1, 1, 'kg', 1.50, 3.99, 10.0, 50.0),
('DAI-MLK-01', 'Whole Milk', 'Fresh Whole Milk, 1 Liter', 2, 2, 'liter', 0.80, 1.49, 20.0, 100.0),
('BAK-BRD-01', 'Whole Wheat Bread', 'Sliced Whole Wheat Loaf', 3, 3, 'loaf', 1.20, 2.99, 15.0, 60.0),
('PAN-RIC-01', 'Basmati Rice', 'Premium Basmati Rice, 1kg bag', 4, 3, 'kg', 2.00, 4.49, 25.0, 100.0),
('BEV-SDA-01', 'Cola Cans', 'Cola Soda, 6-pack cans', 5, 3, 'pack', 2.50, 5.49, 30.0, 150.0),
('FRU-BAN-01', 'Bananas', 'Imported Bananas', 1, 1, 'kg', 0.60, 1.29, 15.0, 40.0),
('DAI-YOG-01', 'Strawberry Yogurt', 'Low-fat Strawberry Yogurt Cup', 2, 2, 'pcs', 0.40, 0.99, 50.0, 200.0),
('PAN-PAS-01', 'Spaghetti Pasta', 'Dried Spaghetti, 500g', 4, 3, 'pack', 0.75, 1.89, 40.0, 120.0);

-- 6. Populate Initial Stock using the Adjustment Procedure
-- This ensures the stock_movements table is populated and the trigger updates inventory.
-- (User IDs correspond to users inserted earlier)
CALL sp_adjust_stock(p_product_id := 1, p_warehouse_id := 1, p_quantity_change := 35.5, p_adjustment_type := 'Initial Stock', p_adjusted_by_user_id := 1, p_notes := 'Initial count'); -- Apples in Main WH
CALL sp_adjust_stock(p_product_id := 2, p_warehouse_id := 2, p_quantity_change := 80.0, p_adjustment_type := 'Initial Stock', p_adjusted_by_user_id := 1, p_notes := 'Initial count'); -- Milk in Cold Storage
CALL sp_adjust_stock(p_product_id := 3, p_warehouse_id := 1, p_quantity_change := 40.0, p_adjustment_type := 'Initial Stock', p_adjusted_by_user_id := 1, p_notes := 'Initial count'); -- Bread in Main WH
CALL sp_adjust_stock(p_product_id := 4, p_warehouse_id := 1, p_quantity_change := 75.0, p_adjustment_type := 'Initial Stock', p_adjusted_by_user_id := 1, p_notes := 'Initial count'); -- Rice in Main WH
CALL sp_adjust_stock(p_product_id := 5, p_warehouse_id := 1, p_quantity_change := 110.0, p_adjustment_type := 'Initial Stock', p_adjusted_by_user_id := 1, p_notes := 'Initial count'); -- Cola in Main WH
CALL sp_adjust_stock(p_product_id := 7, p_warehouse_id := 2, p_quantity_change := 150.0, p_adjustment_type := 'Initial Stock', p_adjusted_by_user_id := 1, p_notes := 'Initial count'); -- Yogurt in Cold Storage
CALL sp_adjust_stock(p_product_id := 8, p_warehouse_id := 1, p_quantity_change := 90.0, p_adjustment_type := 'Initial Stock', p_adjusted_by_user_id := 1, p_notes := 'Initial count'); -- Pasta in Main WH
-- Product 6 (Bananas) deliberately left with 0 initial stock to test low stock view

-- Verify initial inventory (optional check)
-- SELECT * FROM vw_product_stock_levels ORDER BY product_name, warehouse_name;

-- 7. Populate Purchase Orders (Assuming PO IDs 1, 2, 3)
INSERT INTO purchase_orders (supplier_id, order_date, expected_delivery_date, status, created_by_user_id, notes) VALUES
(1, '2023-10-20', '2023-10-27', 'Ordered', 3, 'Weekly fruit restock'), -- PO 1
(2, '2023-10-24', '2023-10-28', 'Ordered', 3, 'Dairy replenishment'),   -- PO 2
(3, '2023-10-25', '2023-10-30', 'Ordered', 3, 'Pantry and Beverage stock'); -- PO 3

-- 8. Populate Purchase Order Items (Assuming po_item_id 1 through 6)
-- PO 1 Items (Ordered, not received)
INSERT INTO purchase_order_items (po_id, product_id, quantity_ordered, unit_price, quantity_received) VALUES
(1, 1, 20.0, 1.50, 0.0), -- Apples (po_item_id 1)
(1, 6, 30.0, 0.60, 0.0); -- Bananas (po_item_id 2)

-- PO 2 Items (Ordered, not received)
INSERT INTO purchase_order_items (po_id, product_id, quantity_ordered, unit_price, quantity_received) VALUES
(2, 2, 50.0, 0.80, 0.0), -- Milk (po_item_id 3)
(2, 7, 100.0, 0.40, 0.0); -- Yogurt (po_item_id 4)

-- PO 3 Items (Ordered, not received)
INSERT INTO purchase_order_items (po_id, product_id, quantity_ordered, unit_price, quantity_received) VALUES
(3, 4, 50.0, 2.00, 0.0), -- Rice (po_item_id 5)
(3, 5, 80.0, 2.50, 0.0), -- Cola (po_item_id 6)
(3, 8, 60.0, 0.75, 0.0); -- Pasta (po_item_id 7)


-- 9. Simulate Receiving some items using the procedure
-- Receive items for PO 1 (Even though status is 'Received', we simulate the movements that *led* to it)
CALL sp_receive_purchase_order_item(p_po_item_id := 1, p_warehouse_id := 1, p_quantity_received := 20.0, p_received_by_user_id := 2, p_notes := 'Received Apples for PO 1');
CALL sp_receive_purchase_order_item(p_po_item_id := 2, p_warehouse_id := 1, p_quantity_received := 30.0, p_received_by_user_id := 2, p_notes := 'Received Bananas for PO 1');

-- Simulate Partial Receiving for PO 3, Item 5 (Rice)
-- This update is not required as the trigger will handle it, but for clarity:
-- UPDATE purchase_orders SET status = 'Partially Received' where po_id = 3; 
CALL sp_receive_purchase_order_item(p_po_item_id := 5, p_warehouse_id := 1, p_quantity_received := 25.0, p_received_by_user_id := 2, p_notes := 'Partial receipt of Rice for PO 3');

-- DEBUG: Check stock before sale adjustment
SELECT product_id, warehouse_id, quantity_on_hand
FROM inventory
WHERE product_id = 2 AND warehouse_id = 2;

-- 10. Simulate some other Stock Movements (e.g., Sales, Adjustments)
-- Simulate a sale of Milk (from Cold Storage)
CALL sp_adjust_stock(p_product_id := 2, p_warehouse_id := 2, p_quantity_change := -10.0, p_adjustment_type := 'Sale', p_adjusted_by_user_id := 2, p_notes := 'Sale Order #SO456');

-- Simulate finding damaged Bread (from Main Warehouse)
CALL sp_adjust_stock(p_product_id := 3, p_warehouse_id := 1, p_quantity_change := -2.0, p_adjustment_type := 'Damage', p_adjusted_by_user_id := 2, p_notes := 'Found crushed loaves');

-- Simulate a Stock Transfer 

CALL sp_initiate_stock_transfer(
    p_product_id := 5, -- Cola Cans
    p_from_warehouse_id := 1, -- Main Warehouse
    p_to_warehouse_id := 2, -- Cold Storage (Maybe an error, Cola usually not cold stored, but for demo)
    p_quantity := 10.0,
    p_initiated_by_user_id := 2,
    p_notes := 'Moving some cola for event'
);


-- Final check of views
SELECT * FROM vw_product_stock_levels ORDER BY product_name, warehouse_name;
SELECT * FROM vw_low_stock_products;
SELECT * FROM vw_pending_purchase_orders;
SELECT * FROM vw_stock_movement_history LIMIT 20;

COMMIT;

-- ROLLBACK; -- Use if testing and something went wrong