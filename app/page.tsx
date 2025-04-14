// app/page.tsx
import Link from 'next/link';
import {
  getDashboardStats,
  getStockByCategory,
  getStockMovements, // Reuse existing function
} from '@/lib/db';
import StatCard from '@/components/StatCard';
import CategoryStockChart from '@/components/CategoryStockChart';
import { format } from 'date-fns';

// Icons (Example using simple text/emoji, consider installing react-icons)
const Icons = {
  Box: '📦',
  Dollar: '💰',
  Warning: '⚠️',
  Truck: '🚚',
  History: '📜',
};

// Helper (move to utils if used elsewhere)
const formatNumeric = (
  value: string | number | null | undefined,
  options?: Intl.NumberFormatOptions,
): string => {
  if (value === null || value === undefined) return '-';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  const defaultOptions: Intl.NumberFormatOptions = {};
  return num.toLocaleString(undefined, { ...defaultOptions, ...options });
};

export default async function HomePage() {
  // Fetch all dashboard data concurrently
  const [stats, categoryData, recentMovements] = await Promise.all([
    getDashboardStats(),
    getStockByCategory(),
    getStockMovements(5), // Get last 5 movements
  ]);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-800">
        eMart Inventory Dashboard
      </h1>

      {/* KPI Cards Section */}
      <section>
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Overview</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Active Products"
            value={formatNumeric(stats.totalActiveProducts)}
            icon={Icons.Box}
            link="/inventory"
            bgColorClass="bg-blue-50"
            textColorClass="text-blue-700"
            valueColorClass="text-blue-900"
          />
          <StatCard
            title="Total Stock Units"
            value={formatNumeric(stats.totalStockUnits, {
              maximumFractionDigits: 0,
            })}
            icon={Icons.Box} // Maybe a different icon?
            bgColorClass="bg-green-50"
            textColorClass="text-green-700"
            valueColorClass="text-green-900"
          />
          <StatCard
            title="Est. Stock Value"
            value={formatNumeric(stats.estimatedStockValue, {
              style: 'currency',
              currency: 'USD',
            })} // Adjust currency
            icon={Icons.Dollar}
            bgColorClass="bg-yellow-50"
            textColorClass="text-yellow-700"
            valueColorClass="text-yellow-900"
          />
          <StatCard
            title="Items Below Reorder"
            value={formatNumeric(stats.lowStockItemsCount)}
            icon={Icons.Warning}
            link="/low-stock"
            bgColorClass={
              stats.lowStockItemsCount > 0 ? 'bg-red-100' : 'bg-orange-50'
            }
            textColorClass={
              stats.lowStockItemsCount > 0 ? 'text-red-700' : 'text-orange-700'
            }
            valueColorClass={
              stats.lowStockItemsCount > 0 ? 'text-red-900' : 'text-orange-900'
            }
          />
          <StatCard
            title="Pending PO Items"
            value={formatNumeric(stats.pendingPoItemsCount)}
            icon={Icons.Truck}
            link="/receive"
            bgColorClass="bg-purple-50"
            textColorClass="text-purple-700"
            valueColorClass="text-purple-900"
          />
        </div>
      </section>

      {/* Main Content Area (Links, Activity, Chart) */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Quick Actions / Links */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">
            Quick Actions
          </h2>
          <Link
            href="/adjustments"
            className="block w-full text-center px-4 py-3 bg-indigo-600 text-white font-medium rounded-md shadow hover:bg-indigo-700 transition"
          >
            Adjust Stock
          </Link>
          <Link
            href="/receive"
            className="block w-full text-center px-4 py-3 bg-teal-600 text-white font-medium rounded-md shadow hover:bg-teal-700 transition"
          >
            Receive PO Items
          </Link>
          {/* Add other primary action links here if needed */}
          <div className="pt-4">
            <h3 className="text-lg font-medium text-gray-600 mb-2">
              Browse Data
            </h3>
            <Link
              href="/inventory"
              className="block p-4 bg-white border border-gray-200 rounded-lg shadow hover:bg-gray-50 transition mb-3"
            >
              <h5 className="font-bold text-gray-800">View Full Inventory</h5>
              <p className="text-sm text-gray-600">
                See current stock levels across all warehouses.
              </p>
            </Link>
            <Link
              href="/movements"
              className="block p-4 bg-white border border-gray-200 rounded-lg shadow hover:bg-gray-50 transition"
            >
              <h5 className="font-bold text-gray-800">View Movement History</h5>
              <p className="text-sm text-gray-600">
                Track all inventory changes.
              </p>
            </Link>
          </div>
        </div>

        {/* Column 2: Recent Activity */}
        <div className="lg:col-span-1 bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-700 mb-4 flex items-center">
            {Icons.History} <span className="ml-2">Recent Movements</span>
          </h2>
          {recentMovements.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {recentMovements.map(m => {
                const isIncrease = parseFloat(m.quantity_change) > 0;
                return (
                  <li key={m.movement_id} className="py-3">
                    <div className="flex justify-between items-center text-sm mb-1">
                      <Link
                        href={`/products/${m.movement_id}`}
                        className="font-medium text-indigo-600 hover:underline truncate pr-2"
                        title={m.product_name}
                      >
                        {m.product_name}
                      </Link>
                      <span
                        className={`font-semibold whitespace-nowrap ${isIncrease ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {isIncrease ? '+' : ''}
                        {formatNumeric(m.quantity_change)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      <span>
                        {m.movement_type} in {m.warehouse_name}
                      </span>
                      <span className="mx-1">·</span>
                      <span title={m.movement_date.toISOString()}>
                        {format(new Date(m.movement_date), 'MMM d, HH:mm')}
                      </span>
                    </div>
                    {m.notes && (
                      <p
                        className="text-xs text-gray-500 mt-1 italic truncate"
                        title={m.notes}
                      >
                        Note: {m.notes}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 italic">
              No recent stock movements found.
            </p>
          )}
          <div className="mt-4 text-center">
            <Link
              href="/movements"
              className="text-sm text-indigo-600 hover:underline"
            >
              View All Movements →
            </Link>
          </div>
        </div>

        {/* Column 3: Category Distribution Chart */}
        <div className="lg:col-span-1 bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">
            Stock by Category (Units)
          </h2>
          <CategoryStockChart data={categoryData} />
        </div>
      </section>
    </div>
  );
}
