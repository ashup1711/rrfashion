import { useState, useMemo } from 'react';
import { useInfiniteProducts } from '../../../hooks/useProducts';
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
  
  const { 
    data, 
    isLoading, 
    error, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = useInfiniteProducts({ 
    ...filters, 
    sortBy: sort.split('_')[0], 
    sortOrder: sort.split('_')[1] as 'asc' | 'desc',
    limit: 12 // Default limit for shop grid
  });

  const products = useMemo(() => {
    return data?.pages.flatMap((page) => page.items) || [];
  }, [data]);

  const totalProducts = data?.pages[0]?.meta.total || 0;

  const handleSortChange = (value: string) => {
    setSort(value);
  };

  if (isLoading) return <LoadingSpinner label="Loading products..." />;
  if (error) return <EmptyState title="Failed to load products" description="Please try again later" />;
  if (products.length === 0) return <EmptyState title="No products found" description="Try adjusting your filters" />;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <p className="text-body text-neutral-dark font-medium">
          Showing <span className="text-primary-900 font-bold">{products.length}</span> of <span className="text-primary-900 font-bold">{totalProducts}</span> products
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-dark font-medium hidden sm:inline">Sort by:</span>
          <select
            value={sort}
            onChange={(e) => handleSortChange(e.target.value)}
            className="text-sm border border-neutral-medium rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white transition-all cursor-pointer hover:border-primary-400"
            aria-label="Sort products"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-card-gap">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {hasNextPage && (
        <div className="mt-12 flex justify-center">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="px-8 py-3 bg-white border-2 border-primary-900 text-primary-900 font-bold rounded-md hover:bg-primary-900 hover:text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider text-sm shadow-sm"
          >
            {isFetchingNextPage ? (
              <span className="flex items-center gap-2">
                <LoadingSpinner size="sm" />
                Loading More...
              </span>
            ) : (
              'Load More Products'
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductGrid;
