import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSaleProducts } from '../../hooks/useSaleProducts';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { formatCurrencyCompact } from '../../utils/formatCurrency';
import { ROUTES } from '../../utils/constants';

const SORT_OPTIONS = [
  { value: 'discount', label: 'Biggest Discount' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest' },
];

/** Map UI sort value to backend sortBy and sortOrder params */
function parseSort(sort: string): { sortBy: string; sortOrder: 'asc' | 'desc' } {
  switch (sort) {
    case 'price-low':
      return { sortBy: 'salePrice', sortOrder: 'asc' };
    case 'price-high':
      return { sortBy: 'salePrice', sortOrder: 'desc' };
    case 'newest':
      return { sortBy: 'createdAt', sortOrder: 'desc' };
    case 'discount':
    default:
      return { sortBy: 'discountPercent', sortOrder: 'desc' };
  }
}

const Sale = () => {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('discount');
  const limit = 20;

  const sortParams = parseSort(sort);
  const { data, isLoading, error } = useSaleProducts({ page, limit, sortBy: sortParams.sortBy, sortOrder: sortParams.sortOrder });

  if (isLoading) {
    return (
      <div className="container-page py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">On Sale</h1>
        <LoadingSpinner label="Loading sale products..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-page py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">On Sale</h1>
        <EmptyState
          title="Something went wrong"
          description="Could not load sale products. Please try again."
        />
      </div>
    );
  }

  const items = data?.items ?? [];

  return (
    <div className="container-page py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">On Sale</h1>
        <select
          value={sort}
          onChange={(e) => {
            setSort(e.target.value);
            setPage(1);
          }}
          className="block rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          aria-label="Sort products"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {!items.length ? (
        <EmptyState
          title="No sales right now"
          description="Check back later for exciting deals and discounts!"
          action={
            <Link to={ROUTES.SHOP}>
              <Button>Browse All Products</Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {items.map((product) => (
              <Link
                key={product.id}
                to={ROUTES.PRODUCT_DETAIL(product.id)}
                className="group bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="relative aspect-[3/4] bg-gray-100 overflow-hidden">
                  <img
                    src={product.images?.[0] || '/images/placeholder.svg'}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  {product.discountPercent > 0 && (
                    <div className="absolute top-2 left-2">
                      <Badge variant="danger">
                        {product.discountPercent}% OFF
                      </Badge>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-xs text-gray-500 mb-1">{product.category?.name}</p>
                  <h3 className="text-sm font-medium text-gray-900 truncate">{product.name}</h3>
                  {product.fabric && (
                    <p className="text-xs text-gray-400 mt-0.5">{product.fabric}</p>
                  )}
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-lg font-semibold text-primary-600">
                      {formatCurrencyCompact(product.salePrice)}
                    </span>
                    <span className="text-sm text-gray-400 line-through">
                      {formatCurrencyCompact(product.basePrice)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {data?.meta && data.meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {data.meta.page} of {data.meta.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Sale;
