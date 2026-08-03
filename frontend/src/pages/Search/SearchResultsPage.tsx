import { useState, useCallback, useMemo, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useSearch } from '../../hooks/useSearch';
import { useCategories } from '../../hooks/useCategories';
import ProductCard from '../../components/common/ProductCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/ui/Button';
import { ROUTES } from '../../utils/constants';
import type { Product } from '../../types/product';
import type { SearchResultItem } from '../../api/search';

/**
 * S-013: Highlight matching terms in search results by wrapping them in <mark> tags.
 * Escapes regex special characters to prevent injection.
 */
const highlightMatch = (text: string, query: string): React.ReactNode => {
  if (!query || query.length < 2) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-yellow-200 rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    ),
  );
};

/**
 * SearchResultsPage — REQ-FE-005
 *
 * Full-text search results page with:
 * - Search input with debounce
 * - Results grid (product cards)
 * - Faceted filters (category, price range)
 * - Pagination
 * - Loading, error, and empty states
 * - Highlighted search matches (S-013)
 */
const SearchResultsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read initial state from URL params
  const initialQuery = searchParams.get('q') || '';
  const initialPage = Number(searchParams.get('page')) || 1;
  const initialCategory = searchParams.get('category') || '';
  const initialInStock = searchParams.get('inStock') === 'true';

  const [searchInput, setSearchInput] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [page, setPage] = useState(initialPage);
  const [category, setCategory] = useState(initialCategory);
  const [inStock, setInStock] = useState(initialInStock);

  // S-007: Fetch categories dynamically instead of hardcoding slugs
  const { data: categories } = useCategories();

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Sync URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set('q', debouncedQuery);
    if (page > 1) params.set('page', String(page));
    if (category) params.set('category', category);
    if (inStock) params.set('inStock', 'true');
    setSearchParams(params, { replace: true });
  }, [debouncedQuery, page, category, inStock, setSearchParams]);

  // Fetch search results
  const { data, isLoading, error } = useSearch({
    q: debouncedQuery,
    page,
    limit: 20,
    category: category || undefined,
    inStock: inStock || undefined,
  });

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  }, []);

  const handleClearFilters = useCallback(() => {
    setCategory('');
    setInStock(false);
    setPage(1);
  }, []);

  // Map API result items to Product type for ProductCard compatibility
  const products: Product[] = useMemo(() => {
    if (!data?.items) return [];
    return data.items.map((item: SearchResultItem) => ({
      ...item,
      isFeatured: false,
      isActive: true,
      sortPriority: 0,
      categoryId: item.categoryId || '',
      variants: [],
      createdAt: '',
      updatedAt: '',
    }));
  }, [data?.items]);

  const hasActiveFilters = category || inStock;

  return (
    <div className="container-page py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Search Results
        </h1>
        {debouncedQuery && data && (
          <p className="text-gray-600">
            {data.total} result{data.total !== 1 ? 's' : ''} for{' '}
            <span className="font-medium text-gray-900">"{debouncedQuery}"</span>
          </p>
        )}
      </div>

      {/* Search Input */}
      <div className="mb-6">
        <div className="relative max-w-xl">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={searchInput}
            onChange={handleSearchChange}
            placeholder="Search for products..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            aria-label="Search products"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
          className="block w-48 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          aria-label="Filter by category"
        >
          <option value="">All Categories</option>
          {categories?.map((cat) => (
            <option key={cat.id} value={cat.slug}>
              {cat.name}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={inStock}
            onChange={(e) => {
              setInStock(e.target.checked);
              setPage(1);
            }}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          In Stock Only
        </label>

        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="text-sm text-primary-600 hover:text-primary-700 underline"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <LoadingSpinner size="lg" label="Searching products..." />
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">
            Something went wrong while searching. Please try again.
          </p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && data && data.items.length === 0 && (
        <EmptyState
          iconType="search"
          title="No products found"
          description={
            debouncedQuery
              ? `No results for "${debouncedQuery}". Try different keywords or browse our categories.`
              : 'Enter a search term to find products.'
          }
          action={
            <Link to={ROUTES.SHOP}>
              <Button variant="outline">Browse All Products</Button>
            </Link>
          }
        />
      )}

      {/* Search Results Grid */}
      {!isLoading && !error && products.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                nameRenderer={
                  debouncedQuery && debouncedQuery.length >= 2
                    ? (name) => highlightMatch(name, debouncedQuery)
                    : undefined
                }
              />
            ))}
          </div>

          {/* Pagination */}
          {data && data.total > 20 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600 px-4">
                Page {data.page} of {Math.ceil(data.total / 20)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= Math.ceil(data.total / 20)}
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

export default SearchResultsPage;
