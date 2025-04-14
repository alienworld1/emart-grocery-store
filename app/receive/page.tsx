import ReceivePOForm from "@/components/ReceivePOForm";
import { getPendingPOItems, getWarehousesForSelect } from "@/lib/db";

export default async function ReceivePage() {
  const [pendingItems, warehouses] = await Promise.all([
    getPendingPOItems(),
    getWarehousesForSelect(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6 text-gray-800">Receive Purchase Order Items</h1>
      {pendingItems.length > 0 ? (
         <ReceivePOForm pendingItems={pendingItems} warehouses={warehouses} />
      ) : (
         <p className="p-4 bg-blue-100 text-blue-800 rounded-md">
            There are no pending purchase order items waiting for receipt.
        </p>
      )}
    </div>
  );
}
