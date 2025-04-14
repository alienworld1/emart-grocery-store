import { StockMovement } from '@/types';
import { getStockMovements } from '@/lib/db';
import { format } from 'date-fns'; // npm install date-fns

const formatNumeric = (value: string | number | null | undefined, options?: Intl.NumberFormatOptions): string => {
    if (value === null || value === undefined) return '-';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    const defaultOptions: Intl.NumberFormatOptions = { minimumFractionDigits: 2, maximumFractionDigits: 3 };
    return num.toLocaleString(undefined, { ...defaultOptions, ...options });
};

export default async function MovementsPage() {
  let movements: StockMovement[] = [];
  let error: string | null = null;
  const limit = 100; // Show last 100 movements

  try {
    movements = await getStockMovements(limit);
  } catch (e) {
    console.error("Failed to fetch movements:", e);
    error = "Could not load stock movements. Please try again later.";
  }

  if (error) {
    return <div className="text-red-600 bg-red-100 p-4 rounded">{error}</div>;
  }

  if (movements.length === 0 && !error) {
     return <div className="text-gray-600 bg-yellow-100 p-4 rounded">No stock movement data found.</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4 text-gray-800">Stock Movement History (Last {limit})</h1>
      <div className="overflow-x-auto bg-white rounded shadow">
        <table className="min-w-full divide-y divide-gray-200 table-auto">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Warehouse</th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Change</th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
              {/* Optional: Add User column if populated */}
              {/* <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th> */}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {movements.map((item) => {
                const quantity = parseFloat(item.quantity_change);
                const isIncrease = quantity > 0;
                return (
                    <tr key={item.movement_id} className="hover:bg-gray-50">
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500" title={item.movement_date.toISOString()}>
                            {format(new Date(item.movement_date), 'yyyy-MM-dd HH:mm')}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-800">{item.sku}</td>
                        <td className="px-3 py-3 text-sm text-gray-700">{item.product_name}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600">{item.warehouse_name}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600">{item.movement_type}</td>
                        <td className={`px-3 py-3 whitespace-nowrap text-sm text-right font-semibold ${isIncrease ? 'text-green-600' : 'text-red-600'}`}>
                            {isIncrease ? '+' : ''}{formatNumeric(quantity)}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">{item.reference_id ?? '-'}</td>
                        <td className="px-3 py-3 text-sm text-gray-500 truncate max-w-xs" title={item.notes ?? ''}>{item.notes ?? '-'}</td>
                        {/* <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">{item.user_name ?? '-'}</td> */}
                    </tr>
                );
             })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
