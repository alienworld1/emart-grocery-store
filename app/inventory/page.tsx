import { getInventoryLevels } from '@/lib/db';
import { ProductStockLevel } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

const formatNumeric = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) return '-';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  });
};

export default async function InventoryPage() {
  let inventory: ProductStockLevel[] = [];
  let error: string | null = null;

  try {
    inventory = await getInventoryLevels();
  } catch (e) {
    console.error('Failed to fetch inventory:', e);
    error = 'Could not load inventory data. Please try again later.';
  }

  if (error) {
    return <div className="text-red-600 bg-red-100 p-4 rounded">{error}</div>;
  }

  if (inventory.length === 0 && !error) {
    return (
      <div className="text-gray-600 bg-yellow-100 p-4 rounded">
        No inventory data found.
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4 text-gray-800">
        Current Inventory Levels
      </h1>
      <div className="overflow-x-auto bg-white rounded shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                SKU
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Product
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Warehouse
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Quantity
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Unit
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Reorder Lvl
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Last Updated
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {inventory.map(item => (
              <tr
                key={`${item.product_id}-${item.warehouse_id}`}
                className="hover:bg-gray-50"
              >
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                  <Link
                    href={`/products/${item.product_id}`}
                    className="text-indigo-600 hover:text-indigo-900 hover:underline"
                  >
                    {item.sku}
                  </Link>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                  <Link
                    href={`/products/${item.product_id}`}
                    className="text-indigo-600 hover:text-indigo-900 hover:underline"
                  >
                    {item.product_name}
                  </Link>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                  {item.warehouse_name}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700">
                  {formatNumeric(item.quantity_on_hand)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                  {item.unit_of_measure}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700">
                  {formatNumeric(item.reorder_level)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                  {formatDistanceToNow(new Date(item.last_updated_at), {
                    addSuffix: true,
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
