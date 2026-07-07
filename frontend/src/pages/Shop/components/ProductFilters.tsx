import { useCategories } from '../../../hooks/useCategories';
import { useBrands } from '../../../hooks/useBrands';
import type { ProductFilters as FilterType } from '../../../types/product';

interface ProductFiltersProps {
  filters: FilterType;
  onFilterChange: (filters: FilterType) => void;
}

const PRICE_RANGES = [
  { label: 'All Prices', min: undefined, max: undefined },
  { label: 'Under ₹500', min: 0, max: 500 },
  { label: '₹500 - ₹2,000', min: 500, max: 2000 },
  { label: '₹2,000 - ₹5,000', min: 2000, max: 5000 },
  { label: 'Above ₹5,000', min: 5000, max: undefined },
];

const ProductFilters = ({ filters, onFilterChange }: ProductFiltersProps) => {
  const { data: categories } = useCategories();
  const { data: brands } = useBrands();

  const setFilter = (key: keyof FilterType, value: unknown) => {
    onFilterChange({ ...filters, [key]: value, page: 1 });
  };

  const resetFilters = () => onFilterChange({});

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Category</h3>
        <ul className="space-y-2">
          <li>
            <button onClick={() => setFilter('categoryId', undefined)}
              className={`text-sm transition-colors ${!filters.categoryId ? 'text-primary-600 font-medium' : 'text-gray-600 hover:text-primary-600'}`}>
              All Categories
            </button>
          </li>
          {categories?.map((cat) => (
            <li key={cat.id}>
              <button onClick={() => setFilter('categoryId', cat.id)}
                className={`text-sm transition-colors ${filters.categoryId === cat.id ? 'text-primary-600 font-medium' : 'text-gray-600 hover:text-primary-600'}`}>
                {cat.name}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {brands && brands.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Brand</h3>
          <ul className="space-y-2">
            <li>
              <button onClick={() => setFilter('brandId', undefined)}
                className={`text-sm transition-colors ${!filters.brandId ? 'text-primary-600 font-medium' : 'text-gray-600 hover:text-primary-600'}`}>
                All Brands
              </button>
            </li>
            {brands.map((brand) => (
              <li key={brand.id}>
                <button onClick={() => setFilter('brandId', brand.id)}
                  className={`text-sm transition-colors ${filters.brandId === brand.id ? 'text-primary-600 font-medium' : 'text-gray-600 hover:text-primary-600'}`}>
                  {brand.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Price Range</h3>
        <ul className="space-y-2">
          {PRICE_RANGES.map((range) => (
            <li key={range.label}>
              <button onClick={() => { setFilter('minPrice', range.min); setFilter('maxPrice', range.max); }}
                className={`text-sm transition-colors ${filters.minPrice === range.min && filters.maxPrice === range.max ? 'text-primary-600 font-medium' : 'text-gray-600 hover:text-primary-600'}`}>
                {range.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <button onClick={resetFilters}
        className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors">
        Reset Filters
      </button>
    </div>
  );
};

export default ProductFilters;
