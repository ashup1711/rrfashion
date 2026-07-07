import { useState } from 'react';
import ProductGrid from './components/ProductGrid';
import ProductFilters from './components/ProductFilters';
import type { ProductFilters as FilterType } from '../../types/product';

const Shop = () => {
  const [filters, setFilters] = useState<FilterType>({});

  return (
    <div className="container-page py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Shop</h1>
        <p className="mt-2 text-gray-600">Browse our collection of fashion products.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="w-full lg:w-64 flex-shrink-0">
          <ProductFilters filters={filters} onFilterChange={setFilters} />
        </aside>
        <main className="flex-1">
          <ProductGrid filters={filters} />
        </main>
      </div>
    </div>
  );
};

export default Shop;
