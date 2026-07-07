import { useState } from 'react';
import { useProducts } from '../../../hooks/useProducts';
import ProductCard from '../../../components/common/ProductCard';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import EmptyState from '../../../components/common/EmptyState';
import type { ProductFilters } from '../../../types/product';

interface ProductGridProps {
  filters?: ProductFilters;
  onFilterChange?: (filters: ProductFilters) => void;
}

const SORT_OPTIONS = [
  { value: 'createdAt_desc', label: 'Newest' },
  { value: 'salePrice_asc', label: 'Price: Low to High' },
  { value: 'salePrice_desc', label: 'Price: High to Low' },
  { value: 'name_asc', label: 'Name A-Z' },
];

const ProductGrid = ({ filters }: ProductGridProps) => {
  const [sort, setSort] = useState('createdAt_desc');
  const { data, isLoading, error } = useProducts({ ...filters, sortBy: sort.split('_')[0], sortOrder: sort.split('_')[1] as 'asc' | 'desc' });

  const handleSortChange = (value: string) => {
    setSort(value);
  };

  if (isLoading) return <LoadingSpinner label="Loading products..." />;
  if (error) return <EmptyState title="Failed to load products" description="Please try again later" />;
  if (!data?.items?.length) return <EmptyState title="No products found" description="Try adjusting your filters" />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-600">Showing {data.meta.total} products</p>
        <select
          value={sort}
          onChange={(e) => handleSortChange(e.target.value)}
          className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
          aria-label="Sort products"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.items.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
};

export default ProductGrid;
