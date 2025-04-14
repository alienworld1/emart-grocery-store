import StockAdjustmentForm from "@/components/StockAdjustmentForm";
import { getProductsForSelect, getWarehousesForSelect } from "@/lib/db";

export default async function AdjustmentPage() {
  // Fetch data needed for dropdowns on the server
  const [products, warehouses] = await Promise.all([
    getProductsForSelect(),
    getWarehousesForSelect(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6 text-gray-800">Stock Adjustment</h1>
      <StockAdjustmentForm products={products} warehouses={warehouses} />
    </div>
  );
}