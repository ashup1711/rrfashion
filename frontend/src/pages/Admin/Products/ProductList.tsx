import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DataTable from '../../../components/ui/DataTable';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Input from '../../../components/ui/Input';
import BulkImportModal from './BulkImportModal';
import BulkActionBar from './BulkActionBar';
import { useProducts, useExportProducts } from '../../../hooks/useProducts';
import { useCategories } from '../../../hooks/useCategories';
import { useBrands } from '../../../hooks/useBrands';
import { ROUTES } from '../../../utils/constants';
import { formatCurrencyCompact } from '../../../utils/formatCurrency';
import { imageUrl } from '../../../utils/imageUrl';
import type { Column } from '../../../components/ui/DataTable';
import type { Product } from '../../../types/product';

const ProductList = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkImport, setShowBulkImport] = useState(false);

  const { mutate: doExport, isPending: isExporting } = useExportProducts();

  const { data: productsData, isLoading, error } = useProducts({
    page,
    limit: 10,
    search: search || undefined,
    categoryId: categoryFilter || undefined,
    brandId: brandFilter || undefined,
  });

  const { data: categories } = useCategories();
  const { data: brands } = useBrands();

  const handleExport = useCallback(() => {
    doExport(undefined, {
      onSuccess: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `products-${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      },
    });
  }, [doExport]);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const columns: Column<Product>[] = [
    {
      key: 'select',
      header: '',
      render: (product) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(product.id)}
          onChange={() => handleToggleSelect(product.id)}
          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          aria-label={`Select ${product.name}`}
        />
      ),
      className: 'w-10',
    },
    {
      key: 'name',
      header: 'Product',
      sortable: true,
      render: (product) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
            {product.images?.[0] ? (
              <img
                src={imageUrl(product.images[0], product.version)}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>
          <div>
            <p className="font-medium text-gray-900 truncate max-w-[200px]">
              {product.name}
            </p>
            <p className="text-xs text-gray-500">{product.slug}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (product) => (
        <span className="text-gray-700">{product.category?.name || '—'}</span>
      ),
    },
    {
      key: 'brand',
      header: 'Brand',
      render: (product) => (
        <span className="text-gray-700">{product.brand?.name || '—'}</span>
      ),
    },
    {
      key: 'basePrice',
      header: 'Base Price',
      sortable: true,
      render: (product) => (
        <span className="font-medium">
          {formatCurrencyCompact(product.basePrice)}
        </span>
      ),
    },
    {
      key: 'stock',
      header: 'Stock',
      render: (product) => (
        <Badge
          variant={
            product.stock > 10
              ? 'success'
              : product.stock > 0
                ? 'warning'
                : 'danger'
          }
        >
          {product.stock}
        </Badge>
      ),
    },
    {
      key: 'isFeatured',
      header: 'Featured',
      render: (product) =>
        product.isFeatured ? (
          <Badge variant="info">Featured</Badge>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (product) => (
        <Badge variant={product.isActive ?? true ? 'success' : 'danger'}>
          {(product.isActive ?? true) ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (product) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(ROUTES.ADMIN_PRODUCT_EDIT(product.id))}
          >
            Edit
          </Button>
        </div>
      ),
    },
  ];

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage your product catalog
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleExport}
            isLoading={isExporting}
            disabled={isExporting}
          >
            {isExporting ? 'Exporting...' : 'Export Excel'}
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowBulkImport(true)}
          >
            Bulk Import
          </Button>
          <Link to={ROUTES.ADMIN_PRODUCT_NEW}>
            <Button>+ Add Product</Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="w-64">
          <Input
            placeholder="Search products..."
            value={search}
            onChange={handleSearch}
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
          className="block w-48 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          aria-label="Filter by category"
        >
          <option value="">All Categories</option>
          {categories?.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        <select
          value={brandFilter}
          onChange={(e) => {
            setBrandFilter(e.target.value);
            setPage(1);
          }}
          className="block w-48 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          aria-label="Filter by brand"
        >
          <option value="">All Brands</option>
          {brands?.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </select>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={productsData?.items || []}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        error={error as Error | null}
        emptyTitle="No products found"
        emptyDescription={
          search || categoryFilter || brandFilter
            ? 'Try adjusting your filters'
            : 'Get started by adding your first product'
        }
        emptyAction={
          !search && !categoryFilter && !brandFilter ? (
            <Link to={ROUTES.ADMIN_PRODUCT_NEW}>
              <Button>+ Add Product</Button>
            </Link>
          ) : undefined
        }
        pagination={
          productsData?.meta
            ? {
                page: productsData.meta.page,
                limit: productsData.meta.limit,
                total: productsData.meta.total,
                totalPages: productsData.meta.totalPages,
                onPageChange: setPage,
              }
            : undefined
        }
      />

      {/* Bulk Import Modal (REQ-FE-010) */}
      <BulkImportModal
        isOpen={showBulkImport}
        onClose={() => setShowBulkImport(false)}
      />

      {/* Bulk Action Bar (REQ-FE-010) */}
      <BulkActionBar
        selectedIds={selectedIds}
        onClearSelection={() => setSelectedIds([])}
      />
    </div>
  );
};

export default ProductList;
