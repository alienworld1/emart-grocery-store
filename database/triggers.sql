-- 1. Function to update the 'updated_at' timestamp automatically
CREATE OR REPLACE FUNCTION fn_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the timestamp trigger to relevant tables
CREATE TRIGGER trg_update_categories_timestamp BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();
CREATE TRIGGER trg_update_suppliers_timestamp BEFORE UPDATE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();
CREATE TRIGGER trg_update_warehouses_timestamp BEFORE UPDATE ON warehouses
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();
CREATE TRIGGER trg_update_products_timestamp BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();
-- Note: inventory.last_updated_at is handled by the stock movement trigger
CREATE TRIGGER trg_update_po_timestamp BEFORE UPDATE ON purchase_orders
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();
CREATE TRIGGER trg_update_transfer_timestamp BEFORE UPDATE ON stock_transfers
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

-- 2. Core Trigger: Update Inventory table whenever a stock movement occurs
CREATE OR REPLACE FUNCTION fn_update_inventory_on_movement()
RETURNS TRIGGER AS $$
BEGIN
    -- Upsert logic: Insert if not exists, update if exists
    INSERT INTO inventory (product_id, warehouse_id, quantity_on_hand, last_updated_at)
    VALUES (NEW.product_id, NEW.warehouse_id, NEW.quantity_change, CURRENT_TIMESTAMP)
    ON CONFLICT (product_id, warehouse_id)
    DO UPDATE SET
        quantity_on_hand = inventory.quantity_on_hand + NEW.quantity_change,
        last_updated_at = CURRENT_TIMESTAMP;

    -- Optional: Check for negative stock AFTER the update (can also be done before)
    IF (SELECT quantity_on_hand FROM inventory WHERE product_id = NEW.product_id AND warehouse_id = NEW.warehouse_id) < 0 THEN
        RAISE EXCEPTION 'Stock quantity cannot be negative for Product ID % in Warehouse ID %. Operation Rolled Back.', NEW.product_id, NEW.warehouse_id;
        -- Note: This check running *after* might be too late in some high-concurrency scenarios.
        -- A BEFORE trigger or check within the calling procedure is often safer.
    END IF;

    RETURN NEW; -- Return value is ignored for AFTER triggers, but good practice
END;
$$ language 'plpgsql';

CREATE TRIGGER trg_after_insert_stock_movement
AFTER INSERT ON stock_movements
FOR EACH ROW
EXECUTE FUNCTION fn_update_inventory_on_movement();


-- 3. Trigger to update PO Item received quantity and PO status (Simplified)
-- This gets complex quickly. A procedure might be better for full logic.
CREATE OR REPLACE FUNCTION fn_update_po_on_receipt()
RETURNS TRIGGER AS $$
DECLARE
    v_po_id INT;
    v_total_ordered NUMERIC;
    v_total_received NUMERIC;
BEGIN
    -- Assuming stock movement reference_id holds the 'po_item_id' for receipts
    -- Or better, assume the procedure calling this knows the po_item_id
    -- For this trigger, let's assume the calling process updates purchase_order_items first

    -- Find the related PO ID from the PO item that was just updated
    SELECT po_id INTO v_po_id
    FROM purchase_order_items
    WHERE po_item_id = TG_ARGV[0]::INT; -- Pass po_item_id as argument (tricky with triggers)
    -- It's generally better to trigger this from an UPDATE on purchase_order_items

    -- Alternative: Trigger on update of purchase_order_items.quantity_received
    -- IF TG_OP = 'UPDATE' AND NEW.quantity_received <> OLD.quantity_received THEN
    --    v_po_id := NEW.po_id;
    -- END IF;

    -- Let's assume this trigger is called AFTER UPDATE on purchase_order_items
    IF TG_OP = 'UPDATE' AND NEW.quantity_received <> OLD.quantity_received THEN
        v_po_id := NEW.po_id;

        -- Check if all items in the PO are fully received
        SELECT SUM(quantity_ordered), SUM(quantity_received)
        INTO v_total_ordered, v_total_received
        FROM purchase_order_items
        WHERE po_id = v_po_id;

        IF v_total_received >= v_total_ordered THEN
            UPDATE purchase_orders SET status = 'Received' WHERE po_id = v_po_id AND status <> 'Cancelled';
        ELSIF v_total_received > 0 THEN
            UPDATE purchase_orders SET status = 'Partially Received' WHERE po_id = v_po_id AND status NOT IN ('Received', 'Cancelled');
        END IF;
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to purchase_order_items table
CREATE TRIGGER trg_update_po_status_on_item_receipt
AFTER UPDATE OF quantity_received ON purchase_order_items
FOR EACH ROW
EXECUTE FUNCTION fn_update_po_on_receipt(); -- This trigger is complex and might need refinement based on exact workflow