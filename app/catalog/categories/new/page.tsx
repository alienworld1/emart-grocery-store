import CreateCategoryForm from '@/components/CreateCategoryForm';
import Link from 'next/link';

export default function NewCategoryPage() {
  return (
    <div>
      <Link
        href="/inventory"
        className="text-sm text-indigo-600 hover:underline mb-4 inline-block"
      >
        ← Back to Inventory
      </Link>
      <h1 className="text-2xl font-semibold mb-6 text-gray-800">
        Create New Category
      </h1>
      <CreateCategoryForm />
    </div>
  );
}
