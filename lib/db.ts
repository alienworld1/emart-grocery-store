import { Pool } from 'pg';
import {
  ProductStockLevel,
  LowStockProduct,
  StockMovement,
  SelectOption,
  PendingPOItemOption,
  ProductDetail,
  ProductLocationStock,
  ProductPageData,
  StockHistoryPoint,
  DashboardStats,
  CategoryStockInfo,
} from '@/types';
import { notFound } from 'next/navigation';

// Ensure the Pool is instantiated only once
let pool: Pool;

function getPool(): Pool {
  if (!pool) {
    if (!process.env.POSTGRES_URL) {
      throw new Error('Missing POSTGRES_URL environment variable');
    }
    console.log('Initializing PostgreSQL connection pool...');
    pool = new Pool({
      connectionString: process.env.POSTGRES_URL,
    });

    pool.on('error', (err, client) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });
  }
  return pool;
}

// Generic query function
export async function query<T>(text: string, params?: any[]): Promise<T[]> {
  const start = Date.now();
  const currentPool = getPool();
  try {
    const res = await currentPool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', {
      text: text.substring(0, 100) + '...',
      duration,
      rows: res.rowCount,
    });
    return res.rows;
  } catch (error) {
    console.error('Error executing query', { text, params, error });
    throw new Error('Database query failed.');
  }
}

// Specific data fetching functions using views

export async function getInventoryLevels(): Promise<ProductStockLevel[]> {
  return query<ProductStockLevel>(`
    SELECT
      product_id, sku, product_name, category_name,
      warehouse_id, warehouse_name, quantity_on_hand, unit_of_measure,
      reorder_level, target_stock_level, last_updated_at
    FROM vw_product_stock_levels
    ORDER BY product_name, warehouse_name;
  `);
}

export async function getLowStock(): Promise<LowStockProduct[]> {
  return query<LowStockProduct>(`
    SELECT
      product_id, sku, product_name, category_name,
      warehouse_id, warehouse_name, quantity_on_hand, unit_of_measure,
      reorder_level, target_stock_level, last_updated_at, shortfall_quantity
    FROM vw_low_stock_products
    ORDER BY shortfall_quantity DESC, product_name;
  `);
}

export async function getStockMovements(limit = 50): Promise<StockMovement[]> {
  return query<StockMovement>(
    `
    SELECT
      movement_id, movement_date, sku, product_name, warehouse_name,
      movement_type, quantity_change, reference_id, user_name, notes
    FROM vw_stock_movement_history
    ORDER BY movement_date DESC, movement_id DESC
    LIMIT $1;
  `,
    [limit],
  );
}

export async function getProductsForSelect(): Promise<SelectOption[]> {
  return query<SelectOption>(`
    SELECT product_id as value, name || ' (SKU: ' || sku || ')' as label
    FROM products
    WHERE is_active = TRUE
    ORDER BY name;
  `);
}

export async function getWarehousesForSelect(): Promise<SelectOption[]> {
  return query<SelectOption>(`
    SELECT warehouse_id as value, name as label
    FROM warehouses
    WHERE is_active = TRUE
    ORDER BY name;
  `);
}

export async function getPendingPOItems(): Promise<PendingPOItemOption[]> {
  // Fetch PO Items that are not fully received from Orders that are 'Ordered' or 'Partially Received'
  return query<PendingPOItemOption>(`
    SELECT
        poi.po_item_id as value,
        'PO#' || po.po_id || ' - ' || p.name || ' (Ordered: ' || poi.quantity_ordered || ', Received: ' || poi.quantity_received || ')' as label,
        poi.product_id as "productId",
        poi.quantity_ordered as "quantityOrdered",
        poi.quantity_received as "quantityReceived"
    FROM purchase_order_items poi
    JOIN products p ON poi.product_id = p.product_id
    JOIN purchase_orders po ON poi.po_id = po.po_id
    WHERE po.status IN ('Ordered', 'Partially Received')
      AND poi.quantity_ordered > poi.quantity_received -- Only show items needing receipt
    ORDER BY po.po_id, p.name;
  `);
}

export async function getProductPageData(
  productId: number,
): Promise<ProductPageData> {
  try {
    const [detailsResult, locationsResult, movementsResult, historyResult] =
      await Promise.all([
        // Query for product details
        query<ProductDetail>(
          `
        SELECT
            p.product_id, p.sku, p.name as product_name, p.description, p.unit_of_measure,
            p.purchase_price, p.selling_price, p.reorder_level, p.target_stock_level,
            p.is_active, p.created_at as product_created_at, p.updated_at as last_updated_at, -- Use product updated_at for main detail
            c.name as category_name,
            s.name as supplier_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.category_id
        LEFT JOIN suppliers s ON p.supplier_id = s.supplier_id
        WHERE p.product_id = $1;
      `,
          [productId],
        ),

        // Query for stock levels per location
        query<ProductLocationStock>(
          `
        SELECT
            w.warehouse_id, w.name as warehouse_name,
            COALESCE(i.quantity_on_hand, 0) as quantity_on_hand,
            COALESCE(i.last_updated_at, NOW()) as last_updated_at -- Provide a default if no inventory record
        FROM warehouses w
        LEFT JOIN inventory i ON w.warehouse_id = i.warehouse_id AND i.product_id = $1
        WHERE w.is_active = TRUE -- Only show active warehouses
        ORDER BY w.name;
      `,
          [productId],
        ),

        // Query for stock movements for this product
        query<StockMovement>(
          `
         SELECT
           sm.movement_id, sm.movement_date, p.sku, p.name as product_name, w.name as warehouse_name,
           sm.movement_type, sm.quantity_change, sm.reference_id, u.username as user_name, sm.notes
         FROM stock_movements sm
         JOIN products p ON sm.product_id = p.product_id -- Join to ensure product context (though filtered by product_id)
         JOIN warehouses w ON sm.warehouse_id = w.warehouse_id
         LEFT JOIN users u ON sm.user_id = u.user_id
         WHERE sm.product_id = $1
         ORDER BY sm.movement_date DESC, sm.movement_id DESC
         LIMIT 100; -- Limit history length for performance
      `,
          [productId],
        ),

        getProductStockHistory(productId),
      ]);

    // Check if product details were found
    if (detailsResult.length === 0) {
      notFound();
    }

    return {
      details: detailsResult[0], // Should only be one product
      locations: locationsResult,
      movements: movementsResult,
      history: historyResult,
    };
  } catch (error) {
    console.error(
      `Database error fetching data for product ${productId}:`,
      error,
    );
    throw new Error(`Failed to load data for product ${productId}.`);
  }
}

export async function getProductStockHistory(
  productId: number,
): Promise<StockHistoryPoint[]> {
  // This query calculates the running total of stock for each warehouse after each movement.
  return query<StockHistoryPoint>(
    `
      WITH RankedMovements AS (
          SELECT
              sm.movement_date,
              sm.warehouse_id,
              w.name as warehouse_name,
              sm.quantity_change,
              -- Assign a row number for ordering within the same timestamp
              ROW_NUMBER() OVER (PARTITION BY sm.warehouse_id, sm.movement_date ORDER BY sm.movement_id) as rn
          FROM stock_movements sm
          JOIN warehouses w ON sm.warehouse_id = w.warehouse_id
          WHERE sm.product_id = $1
      )
      SELECT
          rm.movement_date,
          rm.warehouse_id,
          rm.warehouse_name,
          -- Calculate the running total, partitioning by warehouse
          SUM(rm.quantity_change) OVER (
              PARTITION BY rm.warehouse_id
              ORDER BY rm.movement_date ASC, rm.rn ASC -- Ensure stable order
              ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
          ) as quantity_on_hand_after_movement
      FROM RankedMovements rm
      ORDER BY rm.warehouse_id, rm.movement_date ASC, rm.rn ASC;
    `,
    [productId],
  );
}

export async function getDashboardStats(): Promise<DashboardStats> {
  // Use Promise.all for concurrent queries
  const [
    productCountResult,
    inventoryStatsResult,
    lowStockCountResult,
    pendingPoCountResult,
  ] = await Promise.all([
    query<{ count: string }>(
      `SELECT COUNT(*) FROM products WHERE is_active = TRUE;`,
    ),
    query<{ total_units: string; total_value: string }>(`
            SELECT
                COALESCE(SUM(i.quantity_on_hand), 0) as total_units,
                COALESCE(SUM(i.quantity_on_hand * p.purchase_price), 0) as total_value
            FROM inventory i
            JOIN products p ON i.product_id = p.product_id;
        `),
    // Reuse the low stock view for the count
    query<{ count: string }>(`SELECT COUNT(*) FROM vw_low_stock_products;`),
    // Reuse the logic from getPendingPOItems for the count
    query<{ count: string }>(`
            SELECT COUNT(poi.po_item_id)
            FROM purchase_order_items poi
            JOIN purchase_orders po ON poi.po_id = po.po_id
            WHERE po.status IN ('Ordered', 'Partially Received')
              AND poi.quantity_ordered > poi.quantity_received;
        `),
  ]);

  return {
    totalActiveProducts: parseInt(productCountResult[0]?.count ?? '0', 10),
    totalStockUnits: inventoryStatsResult[0]?.total_units ?? '0',
    estimatedStockValue: inventoryStatsResult[0]?.total_value ?? '0',
    lowStockItemsCount: parseInt(lowStockCountResult[0]?.count ?? '0', 10),
    pendingPoItemsCount: parseInt(pendingPoCountResult[0]?.count ?? '0', 10),
  };
}

// Function to get stock quantity grouped by category
export async function getStockByCategory(): Promise<CategoryStockInfo[]> {
  return query<CategoryStockInfo>(`
        SELECT
            p.category_id,
            COALESCE(c.name, 'Uncategorized') as category_name,
            SUM(i.quantity_on_hand) as total_quantity
        FROM inventory i
        JOIN products p ON i.product_id = p.product_id
        LEFT JOIN categories c ON p.category_id = c.category_id
        WHERE i.quantity_on_hand > 0 -- Only include categories with stock
        GROUP BY p.category_id, c.name
        ORDER BY SUM(i.quantity_on_hand) DESC;
    `);
}
