-- 1. Procedure to receive stock against a Purchase Order Item
CREATE OR REPLACE PROCEDURE sp_receive_purchase_order_item (
    p_po_item_id INT,
    p_warehouse_id INT,
    p_quantity_received NUMERIC,
    p_received_by_user_id INT, -- Optional
    p_notes TEXT DEFAULT NULL
) AS $$
DECLARE
    v_product_id INT;
    v_po_id INT;
    v_quantity_ordered NUMERIC;
    v_current_received NUMERIC;
BEGIN
    -- Validate input
    IF p_quantity_received <= 0 THEN
        RAISE EXCEPTION 'Quantity received must be positive.';
    END IF;

    -- Get PO Item details
    SELECT product_id, po_id, quantity_ordered, quantity_received
    INTO v_product_id, v_po_id, v_quantity_ordered, v_current_received
    FROM purchase_order_items
    WHERE po_item_id = p_po_item_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Purchase Order Item ID % not found.', p_po_item_id;
    END IF;

    -- Check if over-receiving (optional, adjust logic as needed)
    IF (v_current_received + p_quantity_received) > v_quantity_ordered THEN
        RAISE WARNING 'Receiving quantity (%) exceeds ordered quantity (%) for PO Item ID %.',
                      (v_current_received + p_quantity_received), v_quantity_ordered, p_po_item_id;
        -- Decide whether to allow or raise exception:
        -- RAISE EXCEPTION 'Cannot receive more than ordered quantity.';
    END IF;

    -- Check PO status
    IF (SELECT status FROM purchase_orders WHERE po_id = v_po_id) NOT IN ('Ordered', 'Partially Received') THEN
         RAISE EXCEPTION 'Cannot receive items for a PO with status other than Ordered or Partially Received (PO ID %).', v_po_id;
    END IF;

    -- 1. Record the Stock Movement
    INSERT INTO stock_movements (product_id, warehouse_id, movement_type, quantity_change, reference_id, notes, user_id)
    VALUES (v_product_id, p_warehouse_id, 'Purchase Receipt', p_quantity_received, 'PO:' || v_po_id || ', Item:' || p_po_item_id, p_notes, p_received_by_user_id);
    -- The trigger trg_after_insert_stock_movement will update the inventory table.

    -- 2. Update the received quantity on the PO Item
    UPDATE purchase_order_items
    SET quantity_received = quantity_received + p_quantity_received
    WHERE po_item_id = p_po_item_id;
    -- The trigger trg_update_po_status_on_item_receipt will handle PO status update.

    -- Optional: Add further logic like updating PO status directly here if trigger is too complex

END;
$$ LANGUAGE plpgsql;


-- 2. Procedure to perform a stock adjustment
CREATE OR REPLACE PROCEDURE sp_adjust_stock (
    p_product_id INT,
    p_warehouse_id INT,
    p_quantity_change NUMERIC, -- Positive for increase, negative for decrease
    p_adjustment_type VARCHAR, -- e.g., 'Damage', 'Shrinkage', 'Correction', 'Initial Stock', 'Expiry'
    p_adjusted_by_user_id INT, -- Optional
    p_notes TEXT DEFAULT NULL
) AS $$
DECLARE
    v_current_stock NUMERIC;
BEGIN
    -- Validate input
    IF p_quantity_change = 0 THEN
        RAISE EXCEPTION 'Adjustment quantity cannot be zero.';
    END IF;

    -- Check if product and warehouse exist (Foreign key constraints help, but explicit check is good)
    IF NOT EXISTS (SELECT 1 FROM products WHERE product_id = p_product_id) THEN
         RAISE EXCEPTION 'Product ID % not found.', p_product_id;
    END IF;
     IF NOT EXISTS (SELECT 1 FROM warehouses WHERE warehouse_id = p_warehouse_id) THEN
         RAISE EXCEPTION 'Warehouse ID % not found.', p_warehouse_id;
    END IF;

    -- Check if adjustment will result in negative stock (important for decreases)
    IF p_quantity_change < 0 THEN
        SELECT COALESCE(quantity_on_hand, 0)
        INTO v_current_stock
        FROM inventory
        WHERE product_id = p_product_id AND warehouse_id = p_warehouse_id;

        IF (v_current_stock + p_quantity_change) < 0 THEN
            RAISE EXCEPTION 'Stock adjustment would result in negative quantity for Product ID % in Warehouse ID %. Current stock: %', p_product_id, p_warehouse_id, v_current_stock;
        END IF;
    END IF;

    -- Record the Stock Movement
    INSERT INTO stock_movements (product_id, warehouse_id, movement_type, quantity_change, reference_id, notes, user_id)
    VALUES (p_product_id, p_warehouse_id, 'Adjustment_' || p_adjustment_type, p_quantity_change, 'ADJ:' || currval(pg_get_serial_sequence('stock_movements', 'movement_id')), p_notes, p_adjusted_by_user_id);
     -- The trigger trg_after_insert_stock_movement handles the inventory update.

END;
$$ LANGUAGE plpgsql;


-- 3. Procedure to initiate a stock transfer (creates movement records)
CREATE OR REPLACE PROCEDURE sp_initiate_stock_transfer (
    p_product_id INT,
    p_from_warehouse_id INT,
    p_to_warehouse_id INT,
    p_quantity NUMERIC,
    p_initiated_by_user_id INT,
    p_notes TEXT DEFAULT NULL
) AS $$
DECLARE
    v_current_stock NUMERIC;
    v_transfer_id INT;
BEGIN
    -- Validations
    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'Transfer quantity must be positive.';
    END IF;
    IF p_from_warehouse_id = p_to_warehouse_id THEN
        RAISE EXCEPTION 'Source and destination warehouses cannot be the same.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM products WHERE product_id = p_product_id) THEN
         RAISE EXCEPTION 'Product ID % not found.', p_product_id;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM warehouses WHERE warehouse_id = p_from_warehouse_id) THEN
         RAISE EXCEPTION 'Source Warehouse ID % not found.', p_from_warehouse_id;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM warehouses WHERE warehouse_id = p_to_warehouse_id) THEN
         RAISE EXCEPTION 'Destination Warehouse ID % not found.', p_to_warehouse_id;
    END IF;

    -- Check available stock in source warehouse
    SELECT COALESCE(quantity_on_hand, 0)
    INTO v_current_stock
    FROM inventory
    WHERE product_id = p_product_id AND warehouse_id = p_from_warehouse_id;

    IF v_current_stock < p_quantity THEN
        RAISE EXCEPTION 'Insufficient stock for Product ID % in Warehouse ID %. Available: %, Required: %', p_product_id, p_from_warehouse_id, v_current_stock, p_quantity;
    END IF;

    -- Create the transfer header (optional, but good for tracking)
    INSERT INTO stock_transfers (from_warehouse_id, to_warehouse_id, status, initiated_by_user_id, notes)
    VALUES (p_from_warehouse_id, p_to_warehouse_id, 'Shipped', p_initiated_by_user_id, p_notes)
    RETURNING transfer_id INTO v_transfer_id;

    -- Create the transfer item detail
    INSERT INTO stock_transfer_items (transfer_id, product_id, quantity)
    VALUES (v_transfer_id, p_product_id, p_quantity);

    -- Record movement OUT from source warehouse
    INSERT INTO stock_movements (product_id, warehouse_id, movement_type, quantity_change, reference_id, notes, user_id)
    VALUES (p_product_id, p_from_warehouse_id, 'Transfer_Out', -p_quantity, 'TRN:' || v_transfer_id, 'Transfer to Warehouse ' || p_to_warehouse_id, p_initiated_by_user_id);

    -- Record movement IN to destination warehouse
    INSERT INTO stock_movements (product_id, warehouse_id, movement_type, quantity_change, reference_id, notes, user_id)
    VALUES (p_product_id, p_to_warehouse_id, 'Transfer_In', p_quantity, 'TRN:' || v_transfer_id, 'Transfer from Warehouse ' || p_from_warehouse_id, p_initiated_by_user_id);

    -- Mark transfer as received (simplistic model - real world might have separate step)
    -- UPDATE stock_transfers SET status = 'Received' WHERE transfer_id = v_transfer_id;

END;
$$ LANGUAGE plpgsql;


-- 4. Function to get current stock for a specific product/warehouse
CREATE OR REPLACE FUNCTION fn_get_stock_quantity(
    p_product_id INT,
    p_warehouse_id INT
)
RETURNS NUMERIC AS $$
DECLARE
    v_quantity NUMERIC;
BEGIN
    SELECT COALESCE(quantity_on_hand, 0)
    INTO v_quantity
    FROM inventory
    WHERE product_id = p_product_id AND warehouse_id = p_warehouse_id;

    RETURN v_quantity;
END;
$$ LANGUAGE plpgsql;