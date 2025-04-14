// app/products/[productId]/page.tsx
import { getProductPageData } from '@/lib/db';
import { ProductPageData } from '@/types';
import { notFound } from 'next/navigation'; // Import notFound here too
import { formatDistanceToNow, format } from 'date-fns';
import Link from 'next/link';
import StockTrendChart from '@/components/StockTrendChart';

// Consistent formatting helpers (consider moving to utils/formatters.ts)
const formatNumeric = (
  value: string | number | null | undefined,
  options?: Intl.NumberFormatOptions,
): string => {
  if (value === null || value === undefined) return '-';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  const defaultOptions: Intl.NumberFormatOptions = {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  };
  return num.toLocaleString(undefined, { ...defaultOptions, ...options });
};

const formatCurrency = (value: string | number | null | undefined): string => {
  return formatNumeric(value, { style: 'currency', currency: 'USD' }); // Adjust currency as needed
};

interface ProductDetailPageProps {
  params: {
    productId: string; // This comes from the folder name [productId]
  };
}

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const productId = parseInt(params.productId, 10);

  if (isNaN(productId)) {
    notFound(); // If the ID is not a number, show 404
  }

  let data: ProductPageData;
  try {
    data = await getProductPageData(productId);
  } catch (error: any) {
    // Handle errors specifically thrown from getProductPageData or connection issues
    console.error('Error loading product page:', error);
    // Display a user-friendly error message - consider a dedicated error component
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold text-red-600 mb-4">
          Error Loading Product
        </h1>
        <p className="text-red-700 bg-red-100 p-4 rounded">
          {error.message || 'An unexpected error occurred.'}
        </p>
        <Link
          href="/inventory"
          className="mt-4 inline-block text-indigo-600 hover:underline"
        >
          ← Back to Inventory
        </Link>
      </div>
    );
  }

  const { details, locations, movements, history } = data;

  // Should not happen if getProductPageData throws notFound(), but good practice
  if (!details) {
    notFound();
  }

  const totalStock = locations.reduce(
    (sum, loc) => sum + parseFloat(loc.quantity_on_hand),
    0,
  );
  const isLowStockOverall = totalStock < parseFloat(details.reorder_level); // Simple overall check

  return (
    <div className="container mx-auto p-4 space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/inventory"
          className="text-sm text-indigo-600 hover:underline mb-2 inline-block"
        >
          ← Back to Inventory
        </Link>
        <h1 className="text-3xl font-bold text-gray-800">
          {details.product_name}
        </h1>
        <p className="text-md text-gray-500">SKU: {details.sku}</p>
        <span
          className={`mt-1 inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${
            details.is_active
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {details.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Details Section */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          Product Details
        </h2>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
          <div>
            <dt className="font-medium text-gray-500">Category</dt>
            <dd className="mt-1 text-gray-900">
              {details.category_name ?? 'N/A'}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Supplier</dt>
            <dd className="mt-1 text-gray-900">
              {details.supplier_name ?? 'N/A'}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Unit of Measure</dt>
            <dd className="mt-1 text-gray-900">{details.unit_of_measure}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Description</dt>
            <dd className="mt-1 text-gray-900">
              {details.description || (
                <span className="italic text-gray-400">No description</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Purchase Price</dt>
            <dd className="mt-1 text-gray-900">
              {formatCurrency(details.purchase_price)}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Selling Price</dt>
            <dd className="mt-1 text-gray-900">
              {formatCurrency(details.selling_price)}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Reorder Level</dt>
            <dd className="mt-1 text-gray-900">
              {formatNumeric(details.reorder_level)} {details.unit_of_measure}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Target Stock Level</dt>
            <dd className="mt-1 text-gray-900">
              {formatNumeric(details.target_stock_level)}{' '}
              {details.unit_of_measure}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Created On</dt>
            <dd className="mt-1 text-gray-900">
              {format(new Date(details.product_created_at), 'yyyy-MM-dd')}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">
              Last Updated (Details)
            </dt>
            <dd
              className="mt-1 text-gray-900"
              title={details.last_updated_at.toISOString()}
            >
              {formatDistanceToNow(new Date(details.last_updated_at), {
                addSuffix: true,
              })}
            </dd>
          </div>
        </dl>
      </div>

      {/* Stock Locations Section */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          Current Stock Locations
        </h2>
        <div className="mb-3 text-sm font-medium text-gray-800">
          Total Stock:{' '}
          <span
            className={`font-bold ${isLowStockOverall ? 'text-red-600' : 'text-green-700'}`}
          >
            {formatNumeric(totalStock)}
          </span>{' '}
          {details.unit_of_measure}
        </div>
        {locations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Warehouse
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Quantity On Hand
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Last Updated
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {locations.map(loc => (
                  <tr key={loc.warehouse_id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                      {loc.warehouse_name}
                    </td>
                    <td
                      className={`px-4 py-2 whitespace-nowrap text-sm text-right font-semibold ${parseFloat(loc.quantity_on_hand) <= 0 ? 'text-gray-500' : parseFloat(loc.quantity_on_hand) < parseFloat(details.reorder_level) ? 'text-orange-600' : 'text-gray-900'}`}
                    >
                      {formatNumeric(loc.quantity_on_hand)}
                    </td>
                    <td
                      className="px-4 py-2 whitespace-nowrap text-sm text-gray-500"
                      title={loc.last_updated_at.toISOString()}
                    >
                      {formatDistanceToNow(new Date(loc.last_updated_at), {
                        addSuffix: true,
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">
            No stock recorded in any active warehouses.
          </p>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          Stock Level Trend
        </h2>
        <StockTrendChart historyData={history} />
      </div>

      {/* Stock Movements Section */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          Stock Movement History (Last {movements.length})
        </h2>
        {movements.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 table-auto">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Date
                  </th>
                  {/* SKU/Product Name columns removed as they are redundant on this page */}
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Warehouse
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Type
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Change
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Reference
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Notes
                  </th>
                  {/* <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th> */}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {movements.map(item => {
                  const quantity = parseFloat(item.quantity_change);
                  const isIncrease = quantity > 0;
                  return (
                    <tr key={item.movement_id} className="hover:bg-gray-50">
                      <td
                        className="px-3 py-3 whitespace-nowrap text-sm text-gray-500"
                        title={item.movement_date.toISOString()}
                      >
                        {format(
                          new Date(item.movement_date),
                          'yyyy-MM-dd HH:mm',
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600">
                        {item.warehouse_name}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600">
                        {item.movement_type}
                      </td>
                      <td
                        className={`px-3 py-3 whitespace-nowrap text-sm text-right font-semibold ${isIncrease ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {isIncrease ? '+' : ''}
                        {formatNumeric(quantity)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                        {item.reference_id ?? '-'}
                      </td>
                      <td
                        className="px-3 py-3 text-sm text-gray-500 truncate max-w-xs"
                        title={item.notes ?? ''}
                      >
                        {item.notes ?? '-'}
                      </td>
                      {/* <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">{item.user_name ?? '-'}</td> */}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">
            No stock movement history found for this product.
          </p>
        )}
      </div>
    </div>
  );
}

// Optional: Add metadata generation
export async function generateMetadata({ params }: ProductDetailPageProps) {
  const productId = parseInt(params.productId, 10);
  if (isNaN(productId)) {
    return { title: 'Invalid Product' };
  }
  try {
    const data = await getProductPageData(productId);
    if (data.details) {
      return { title: `${data.details.product_name} Details - eMart Admin` };
    } else {
      return { title: 'Product Not Found - eMart Admin' };
    }
  } catch (error) {
    // Catch potential notFound() during metadata generation or other DB errors
    console.error('Metadata generation error:', error);
    return { title: 'Error - eMart Admin' };
  }
}

// Optional: Revalidation strategy for product details
// export const revalidate = 60; // Revalidate every 60 seconds
