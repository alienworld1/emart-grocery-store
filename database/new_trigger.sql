CREATE OR REPLACE FUNCTION fn_update_inventory_on_movement_alternative()
RETURNS TRIGGER AS $$
DECLARE
    v_updated_rows INT;
BEGIN
    -- Attempt to UPDATE first
    UPDATE inventory
       SET quantity_on_hand = inventory.quantity_on_hand + NEW.quantity_change,
           last_updated_at = CURRENT_TIMESTAMP
     WHERE product_id = NEW.product_id
       AND warehouse_id = NEW.warehouse_id;

    -- Check if the UPDATE affected any row using GET DIAGNOSTICS
    GET DIAGNOSTICS v_updated_rows = ROW_COUNT;

    -- If no row was updated (meaning it didn't exist before), INSERT a new one
    IF v_updated_rows = 0 THEN
        -- This block should theoretically not be reached for the failing case,
        -- as we know the row exists.
        INSERT INTO inventory (product_id, warehouse_id, quantity_on_hand, last_updated_at)
        VALUES (NEW.product_id, NEW.warehouse_id, NEW.quantity_change, CURRENT_TIMESTAMP);
    END IF;

    RETURN NEW; -- Return value ignored for AFTER triggers
END;
$$ language 'plpgsql';

-- Remove the old trigger
DROP TRIGGER IF EXISTS trg_after_insert_stock_movement ON stock_movements;

-- Create the trigger using the new function
CREATE TRIGGER trg_after_insert_stock_movement
AFTER INSERT ON stock_movements
FOR EACH ROW
EXECUTE FUNCTION fn_update_inventory_on_movement_alternative();