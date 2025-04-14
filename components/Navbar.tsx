// components/Navbar.tsx
import Link from 'next/link';

const Navbar = () => {
  return (
    <nav className="bg-white shadow-md mb-6">
      {' '}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-stone-900">
              eMart Grocery Store
            </Link>
          </div>
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              <Link
                href="/inventory"
                className="text-gray-700 hover:bg-gray-100 hover:text-black px-3 py-2 rounded-md text-sm font-medium"
              >
                Inventory
              </Link>
              <Link
                href="/low-stock"
                className="text-gray-700 hover:bg-gray-100 hover:text-black px-3 py-2 rounded-md text-sm font-medium"
              >
                Low Stock
              </Link>
              <Link
                href="/movements"
                className="text-gray-700 hover:bg-gray-100 hover:text-black px-3 py-2 rounded-md text-sm font-medium"
              >
                Movements
              </Link>
              <Link
                href="/adjustments"
                className="text-gray-700 hover:bg-gray-100 hover:text-black px-3 py-2 rounded-md text-sm font-medium"
              >
                Adjust Stock
              </Link>
              <Link
                href="/receive"
                className="text-gray-700 hover:bg-gray-100 hover:text-black px-3 py-2 rounded-md text-sm font-medium"
              >
                Receive PO
              </Link>
              <div className="relative inline-block text-left group">
                {/* Basic text as trigger, replace with proper dropdown component later */}
                <span className="text-gray-700 hover:bg-gray-100 hover:text-black px-3 py-2 rounded-md text-sm font-medium cursor-pointer">
                  Catalog
                </span>
                <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-150 ease-in-out z-10">
                  {/* Simple hover dropdown */}
                  <div className="py-1" role="none">
                    <Link
                      href="/catalog/products/new"
                      className="text-gray-700 block px-4 py-2 text-sm hover:bg-gray-100"
                      role="menuitem"
                    >
                      Add Product
                    </Link>
                    <Link
                      href="/catalog/categories/new"
                      className="text-gray-700 block px-4 py-2 text-sm hover:bg-gray-100"
                      role="menuitem"
                    >
                      Add Category
                    </Link>
                    {/* Add links to list categories/suppliers later */}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
