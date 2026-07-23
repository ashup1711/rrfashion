import { useState } from 'react';
import ProductGrid from './components/ProductGrid';
import ProductFilters from './components/ProductFilters';
import Breadcrumb from '../../components/common/Breadcrumb';
import { useProductCounts } from '../../hooks/useProducts';
import type { ProductFilters as FilterType } from '../../types/product';

const Shop = () => {
  const [filters, setFilters] = useState<FilterType>({});
  const { data: productCounts } = useProductCounts();

  return (
    <div className="container-page py-8">
      <Breadcrumb items={[{ label: 'Shop' }]} />

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Shop</h1>
        <p className="mt-2 text-gray-600">Browse our collection of fashion products.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="w-full lg:w-64 flex-shrink-0">
          <ProductFilters
            filters={filters}
            onFilterChange={setFilters}
            productCounts={productCounts}
          />
        </aside>
        <main className="flex-1">
          <ProductGrid filters={filters} />
        </main>
      </div>
    </div>
  );
};

export default Shop;
