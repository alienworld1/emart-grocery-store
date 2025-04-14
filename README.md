# e-Mart grocery store

## 1. Tables

Each table holds data about _one specific type of thing_.

- **`categories`**:

  - **What it is:** A list of all product types (e.g., "Dairy", "Produce", "Canned Goods", "Beverages").
  - **Why:** Organizes products. Makes it easy to search, filter, and report on groups of items (e.g., "Show me all Dairy products low on stock"). Avoids typing "Dairy" repeatedly and inconsistently.
  - **Analogy:** Labels on different aisles or sections in the grocery store.

- **`suppliers`**:

  - **What it is:** Information about the companies you buy products from (name, contact info, address).
  - **Why:** Keeps track of who supplies what. Needed for creating Purchase Orders and managing relationships.
  - **Analogy:** Your business contact book or Rolodex, specifically for suppliers.

- **`warehouses`**:

  - **What it is:** The physical (or logical) locations where you store stock (e.g., "Main Warehouse", "Cold Storage", "Shop Floor").
  - **Why:** You need to know _where_ your stock is located, especially if you have multiple storage areas.
  - **Analogy:** Different rooms or designated zones within your physical warehouse/store.

- **`products`**:

  - **What it is:** Your master catalog of every unique grocery item you sell (Milk 1L, Organic Apples, Corn Flakes 500g). Includes details like SKU (unique code), name, description, which category it belongs to, its default supplier, cost price, selling price, and reorder levels.
  - **Why:** This is the central definition of _what_ you stock. It doesn't store the _quantity_ here, just the item's characteristics.
  - **Analogy:** The detailed product catalog or specification sheet for each item.

- **`inventory`**:

  - **What it is:** The **crucial** table showing the _current quantity_ of each product in _each warehouse_.
  - **Why:** This tells you exactly how many units of Product X you have right now in Warehouse Y. This is the number that changes constantly with sales, receipts, and adjustments.
  - **Reasoning:** We separate the _definition_ of a product (`products` table) from its _current stock level_ (`inventory` table). This is efficient because product details (like name, description) don't change often, but the quantity does.
  - **Analogy:** The live digital count display on the shelf edge for each item in each specific warehouse location.

- **`stock_movements`**:

  - **What it is:** A **logbook or audit trail** of _every single event_ that changed the stock quantity. Records details like: which product, which warehouse, when, why (sale, purchase receipt, damage, transfer), how much the quantity changed (+ or -), and potentially who did it.
  - **Why:** This is **essential for accountability and debugging**. If the `inventory` count seems wrong, you check this logbook to see exactly what transactions happened. It answers "Why do we have only 5 units of milk left?".
  - **Reasoning:** Instead of just overwriting the quantity in the `inventory` table directly, we record _every_ change here. This provides history and traceability. The `inventory` table becomes a _calculated summary_ based on these movements.
  - **Analogy:** The detailed transaction history in your bank account – every deposit, withdrawal, and transfer is listed.

- **`purchase_orders` (PO)** & **`purchase_order_items`**:

  - **What they are:** Represents an order placed with a supplier. The `purchase_orders` table has header info (who the supplier is, date, status like 'Pending' or 'Received'). The `purchase_order_items` table lists the specific products and quantities ordered on that PO.
  - **Why:** Manages the process of buying new stock. Tracks what you've ordered, what's expected, and what has arrived.
  - **Reasoning:** A single order (`purchase_orders`) can contain multiple products (`purchase_order_items`), so we use two related tables (a one-to-many relationship).
  - **Analogy:** The official order form you send to your supplier (`purchase_orders`) and the itemized list attached to it (`purchase_order_items`).

- **`stock_transfers`** & **`stock_transfer_items`**: (Optional, but common)

  - **What they are:** Records the movement of stock _between_ your own warehouses. Similar structure to POs (header and items).
  - **Why:** To formally track internal movements, ensuring stock isn't lost and counts are updated correctly in both source and destination locations.
  - **Analogy:** An internal transfer request form used when moving goods from the back warehouse to the shop floor.

- **`users`**: (Optional, for auditing)
  - **What it is:** A list of people who use the system.
  - **Why:** To track who performed certain actions (like receiving stock or making adjustments), linking back to the `user_id` in `stock_movements`.
  - **Analogy:** Employee ID badges.

## 2. Views

- **`vw_product_stock_levels`**:

  - **What it does:** Combines product details (name, SKU from `products`) with current quantity (`inventory`) and warehouse info (`warehouses`). Gives a user-friendly overview of stock.
  - **Why:** Saves you from manually joining tables every time you want to see stock levels with product names.
  - **Analogy:** A constantly updated dashboard showing current stock for all items across all locations.

- **`vw_low_stock_products`**:

  - **What it does:** Filters the `vw_product_stock_levels` view to show _only_ products whose quantity is below their defined reorder level.
  - **Why:** Immediately highlights items that need reordering. Actionable insight.
  - **Analogy:** A "Red Alert" report showing only the urgent items needing attention.

- **`vw_pending_purchase_orders`**:

  - **What it does:** Shows purchase orders that haven't been fully received yet.
  - **Why:** Helps purchasing and warehouse staff track expected incoming deliveries.
  - **Analogy:** A list of "Orders Placed, Awaiting Delivery".

- **`vw_stock_movement_history`**:
  - **What it does:** Presents the raw `stock_movements` log in a more readable format, often joining with product and user names.
  - **Why:** Makes it easier to investigate the history of a specific item's stock changes.
  - **Analogy:** A detailed, easy-to-read printout of your bank transaction history.

## 3. Triggers

- **`fn_update_timestamp` / `trg_update_..._timestamp`**:

  - **What it does:** Automatically updates the `updated_at` field whenever a row in certain tables is changed.
  - **Why:** Simple housekeeping. Useful for knowing when data was last modified without needing manual updates.
  - **Analogy:** Automatically stamping the date and time on a document whenever you save changes.

- **`fn_update_inventory_on_movement` / `trg_after_insert_stock_movement`**:

  - **What it does:** This is **critically important**. Whenever a new row is added to `stock_movements` (meaning a stock change occurred), this trigger automatically updates the `quantity_on_hand` in the main `inventory` table for the correct product and warehouse.
  - **Why:** Ensures the `inventory` table _always_ reflects the sum of all historical movements. It keeps the live count accurate and consistent with the logbook, automatically. It also prevents direct, unlogged changes to inventory counts.
  - **Analogy:** When you log a transaction (deposit/withdrawal) in your checkbook register (`stock_movements`), the running balance (`inventory`) automatically recalculates.

- **`fn_update_po_on_receipt` / `trg_update_po_status_on_item_receipt`**:
  - **What it does:** When the quantity received for an item on a purchase order is updated, this trigger checks if the whole PO is now fully or partially received and updates the status of the main `purchase_orders` record accordingly.
  - **Why:** Automates the status tracking of purchase orders based on receiving activities.
  - **Analogy:** When you check off the last item on a delivery packing slip, a system automatically marks the entire order as "Complete".

## 4. Functions & Stored Procedures

- **`sp_receive_purchase_order_item` (Procedure)**:

  - **What it does:** Encapsulates the entire process of receiving stock against a specific PO item: validates input, checks the PO status, records the positive stock movement in `stock_movements` (which triggers the inventory update), and updates the `quantity_received` on the `purchase_order_items` table (which triggers the PO status update).
  - **Why:** Ensures receiving is done consistently and correctly every time, following all necessary steps. Reduces errors and simplifies the process for the user/application.
  - **Analogy:** The official, step-by-step "Goods Receiving Checklist/Procedure" that staff must follow.

- **`sp_adjust_stock` (Procedure)**:

  - **What it does:** Provides a standard way to make manual stock adjustments (e.g., for damage, expiry, counting errors). It validates the change, checks for negative stock, and records the adjustment in `stock_movements` (triggering the inventory update).
  - **Why:** Creates a controlled process for adjustments, ensuring they are logged correctly with a reason. Prevents random, untracked changes to inventory counts.
  - **Analogy:** The official "Stock Write-Off/Adjustment Form" and procedure.

- **`sp_initiate_stock_transfer` (Procedure)**:

  - **What it does:** Handles the process of moving stock between warehouses. Checks availability, creates the transfer record (optional), and importantly, creates _two_ `stock_movements` records: one negative ('Transfer_Out') for the source warehouse and one positive ('Transfer_In') for the destination warehouse.
  - **Why:** Ensures internal transfers are properly logged and inventory is correctly debited from one location and credited to another.
  - **Analogy:** The standard procedure for requesting and executing an internal stock move.

- **`fn_get_stock_quantity` (Function)**:
  - **What it does:** A simple utility function that quickly returns the current quantity for a specific product in a specific warehouse by looking it up in the `inventory` table.
  - **Why:** Provides a clean, reusable way for applications or other procedures to check stock levels without writing the query repeatedly.
  - **Analogy:** A quick lookup tool or asking the system "How many of Product X in Warehouse Y?".

## Summary

1. **Normalization:** Avoids storing the same piece of information (like a supplier's address) in multiple places. You store it once in the `suppliers` table and just refer to its ID elsewhere. This makes updates easier and prevents inconsistencies.
2. **Data Integrity:** Using Primary Keys (unique IDs), Foreign Keys (links between tables), and Constraints (like `CHECK quantity >= 0`) ensures data is accurate and relationships are maintained.
3. **Auditability:** The `stock_movements` table is the cornerstone. It provides a complete history, making the system transparent and accountable.
4. **Efficiency:** Separating static product info from dynamic inventory counts is efficient. Views provide quick access to common data combinations.
5. **Consistency & Control:** Procedures and triggers ensure business rules are followed consistently and automatically, reducing manual errors.
