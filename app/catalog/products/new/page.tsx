import CreateProductForm from '@/components/CreateProductForm';
import { getCategoriesForSelect, getSuppliersForSelect } from '@/lib/db';
import Link from 'next/link';

export default async function NewProductPage() {
  // Fetch data for dropdowns server-side
  const [categories, suppliers] = await Promise.all([
    getCategoriesForSelect(),
    getSuppliersForSelect(),
  ]);

  return (
    <div>
      <Link
        href="/inventory"
        className="text-sm text-indigo-600 hover:underline mb-4 inline-block"
      >
        ← Back to Inventory
      </Link>
      <h1 className="text-2xl font-semibold mb-6 text-gray-800">
        Create New Product
      </h1>
      <CreateProductForm categories={categories} suppliers={suppliers} />
    </div>
  );
}
