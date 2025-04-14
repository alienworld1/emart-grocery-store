export interface ProductStockLevel {
  product_id: number;
  sku: string;
  product_name: string;
  category_name: string | null;
  warehouse_id: number;
  warehouse_name: string;
  quantity_on_hand: string; // NUMERIC comes as string
  unit_of_measure: string;
  reorder_level: string; // NUMERIC comes as string
  target_stock_level: string; // NUMERIC comes as string
  last_updated_at: Date;
}

export interface StockMovement {
  movement_id: number;
  movement_date: Date;
  sku: string;
  product_name: string;
  warehouse_name: string;
  movement_type: string;
  quantity_change: string; // NUMERIC comes as string
  reference_id: string | null;
  user_name: string | null; // If user joined
  notes: string | null;
}

export interface LowStockProduct extends ProductStockLevel {
  shortfall_quantity: string; // NUMERIC comes as string
}

export interface SelectOption {
  value: number;
  label: string;
}

export interface PendingPOItemOption {
  value: number; // po_item_id
  label: string; // Formatted string
  productId: number;
  quantityOrdered: string; // NUMERIC comes as string
  quantityReceived: string; // NUMERIC comes as string
}

export interface ProductDetail extends ProductStockLevel {
  description: string | null;
  supplier_name: string | null;
  purchase_price: string; // NUMERIC
  selling_price: string; // NUMERIC
  is_active: boolean;
  product_created_at: Date; // Alias to avoid conflict
}

export interface ProductLocationStock {
  warehouse_id: number;
  warehouse_name: string;
  quantity_on_hand: string; // NUMERIC
  last_updated_at: Date;
}

// Combined type for the detail page data
export interface ProductPageData {
  details: ProductDetail | null;
  locations: ProductLocationStock[];
  movements: StockMovement[];
  history: StockHistoryPoint[];
}

export interface StockHistoryPoint {
  movement_date: Date;
  warehouse_id: number;
  warehouse_name: string; // Add warehouse name for the legend/tooltip
  quantity_on_hand_after_movement: string; // NUMERIC from SUM() OVER()
}

export interface DashboardStats {
  totalActiveProducts: number;
  totalStockUnits: string; // Sum of all quantities
  estimatedStockValue: string; // Sum of quantity * purchase_price
  lowStockItemsCount: number;
  pendingPoItemsCount: number;
}

export interface CategoryStockInfo {
  category_id: number | null; // Handle products with no category
  category_name: string;
  total_quantity: string; // Sum of quantities for the category
}
