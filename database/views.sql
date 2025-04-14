-- 1. View current stock levels with product details
CREATE VIEW vw_product_stock_levels AS
SELECT
    p.product_id,
    p.sku,
    p.name AS product_name,
    c.name AS category_name,
    w.warehouse_id,
    w.name AS warehouse_name,
    COALESCE(i.quantity_on_hand, 0) AS quantity_on_hand,
    p.unit_of_measure,
    p.reorder_level,
    p.target_stock_level,
    i.last_updated_at
FROM
    products p
LEFT JOIN
    categories c ON p.category_id = c.category_id
LEFT JOIN
    inventory i ON p.product_id = i.product_id
LEFT JOIN
    warehouses w ON i.warehouse_id = w.warehouse_id
WHERE
    p.is_active = TRUE;

-- 2. View products below reorder level
CREATE VIEW vw_low_stock_products AS
SELECT
    vpsl.*,
    (vpsl.reorder_level - vpsl.quantity_on_hand) AS shortfall_quantity
FROM
    vw_product_stock_levels vpsl
WHERE
    vpsl.quantity_on_hand < vpsl.reorder_level;

-- 3. View Pending/Ordered Purchase Orders Needing Receipt
CREATE VIEW vw_pending_purchase_orders AS
SELECT
    po.po_id,
    s.name AS supplier_name,
    po.order_date,
    po.expected_delivery_date,
    po.status,
    SUM(poi.quantity_ordered * poi.unit_price) AS estimated_total
FROM
    purchase_orders po
JOIN
    suppliers s ON po.supplier_id = s.supplier_id
JOIN
    purchase_order_items poi ON po.po_id = poi.po_id
WHERE
    po.status IN ('Pending', 'Ordered', 'Partially Received')
GROUP BY
    po.po_id, s.name, po.order_date, po.expected_delivery_date, po.status
ORDER BY
    po.order_date DESC;

-- 4. Detailed Stock Movement History
CREATE VIEW vw_stock_movement_history AS
SELECT
    sm.movement_id,
    sm.movement_date,
    p.sku,
    p.name AS product_name,
    w.name AS warehouse_name,
    sm.movement_type,
    sm.quantity_change,
    sm.reference_id,
    u.username AS user_name, -- Join with users table if user_id is implemented
    sm.notes
FROM
    stock_movements sm
JOIN
    products p ON sm.product_id = p.product_id
JOIN
    warehouses w ON sm.warehouse_id = w.warehouse_id
LEFT JOIN
    users u ON sm.user_id = u.user_id -- Optional join
ORDER BY
    sm.movement_date DESC, sm.movement_id DESC;