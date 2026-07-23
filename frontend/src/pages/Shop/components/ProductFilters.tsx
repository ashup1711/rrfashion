import { useState, useEffect } from 'react';
import { useCategories } from '../../../hooks/useCategories';
import { useBrands } from '../../../hooks/useBrands';
import type { ProductFilters as FilterType, ProductCountsResponse } from '../../../types/product';

interface ProductFiltersProps {
  filters: FilterType;
  onFilterChange: (filters: FilterType) => void;
  productCounts?: ProductCountsResponse;
}

const COLORS = [
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Red', hex: '#EF4444' },
  { name: 'Blue', hex: '#3B82F6' },
  { name: 'Green', hex: '#10B981' },
  { name: 'Yellow', hex: '#F59E0B' },
  { name: 'Pink', hex: '#EC4899' },
  { name: 'Purple', hex: '#8B5CF6' },
  { name: 'Beige', hex: '#F5F5DC' },
  { name: 'Gold', hex: '#D4AF37' },
];

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];

const Accordion = ({ 
  title, 
  children, 
  isOpen: defaultOpen = true 
}: { 
  title: string; 
  children: React.ReactNode; 
  isOpen?: boolean 
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-neutral-medium py-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-sm font-semibold text-neutral-nearBlack uppercase tracking-wider">
          {title}
        </span>
        <svg
          className={`h-5 w-5 text-neutral-dark transition-transform duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        className={`mt-4 overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        {children}
      </div>
    </div>
  );
};

const PriceSlider = ({
  min,
  max,
  onChange,
}: {
  min?: number;
  max?: number;
  onChange: (min: number, max: number) => void;
}) => {
  const [minValue, setMinValue] = useState(min || 0);
  const [maxValue, setMaxValue] = useState(max || 10000);

  useEffect(() => {
    setMinValue(min || 0);
    setMaxValue(max || 10000);
  }, [min, max]);

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.min(Number(e.target.value), maxValue - 500);
    setMinValue(value);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(Number(e.target.value), minValue + 500);
    setMaxValue(value);
  };

  const handleMouseUp = () => {
    onChange(minValue, maxValue);
  };

  return (
    <div className="px-2 pt-4 pb-2">
      <div className="relative h-1 w-full bg-neutral-medium rounded-full">
        <div
          className="absolute h-1 bg-primary-500 rounded-full"
          style={{
            left: `${(minValue / 10000) * 100}%`,
            right: `${100 - (maxValue / 10000) * 100}%`,
          }}
        />
        <input
          type="range"
          min="0"
          max="10000"
          step="100"
          value={minValue}
          onChange={handleMinChange}
          onMouseUp={handleMouseUp}
          onTouchEnd={handleMouseUp}
          className="absolute pointer-events-none appearance-none z-20 h-1 w-full bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary-500"
        />
        <input
          type="range"
          min="0"
          max="10000"
          step="100"
          value={maxValue}
          onChange={handleMaxChange}
          onMouseUp={handleMouseUp}
          onTouchEnd={handleMouseUp}
          className="absolute pointer-events-none appearance-none z-20 h-1 w-full bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary-500"
        />
      </div>
      <div className="mt-6 flex items-center justify-between text-xs text-neutral-dark font-medium">
        <span>₹{minValue.toLocaleString()}</span>
        <span>₹{maxValue.toLocaleString()}+</span>
      </div>
    </div>
  );
};

const ProductFilters = ({ filters, onFilterChange, productCounts }: ProductFiltersProps) => {
  const { data: categories } = useCategories();
  const { data: brands } = useBrands();
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const setFilter = (key: keyof FilterType, value: unknown) => {
    onFilterChange({ ...filters, [key]: value, page: 1 });
  };

  const toggleArrayFilter = (key: 'sizes' | 'colors' | 'brands', value: string) => {
    const current = (filters[key] as string[]) || [];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    setFilter(key, updated.length > 0 ? updated : undefined);
  };

  const resetFilters = () => {
    onFilterChange({});
    setIsMobileDrawerOpen(false);
  };

  const FilterContent = () => (
    <div className="space-y-2">
      {/* Shop Sale Items Only toggle */}
      <div className="border-b border-neutral-medium py-4">
        <label className="flex items-center justify-between cursor-pointer group">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-neutral-nearBlack uppercase tracking-wider">
              Shop Sale Items Only
            </span>
            <span className="px-2 py-0.5 bg-error/10 text-error text-xs font-bold rounded">
              SALE
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={filters.onSale || false}
            aria-label="Shop sale items only"
            onClick={() => {
              onFilterChange({ ...filters, onSale: !filters.onSale, page: 1 });
            }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              filters.onSale ? 'bg-primary-500' : 'bg-neutral-medium'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                filters.onSale ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </label>
      </div>

      <Accordion title="Category" isOpen={true}>
        <ul className="space-y-2">
          <li>
            <button
              onClick={() => setFilter('categoryId', undefined)}
              className={`text-sm transition-colors ${
                !filters.categoryId
                  ? 'text-primary-600 font-semibold'
                  : 'text-neutral-dark hover:text-primary-600'
              }`}
            >
              All Categories
            </button>
          </li>
          {categories?.map((cat) => (
            <li key={cat.id}>
              <button
                onClick={() => setFilter('categoryId', cat.id)}
                className={`text-sm transition-colors flex items-center gap-2 ${
                  filters.categoryId === cat.id
                    ? 'text-primary-600 font-semibold'
                    : 'text-neutral-dark hover:text-primary-600'
                }`}
              >
                <span>{cat.name}</span>
                {productCounts?.categories?.[cat.id] != null && (
                  <span className="text-xs text-neutral-medium">
                    ({productCounts.categories[cat.id]})
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </Accordion>

      <Accordion title="Price Range">
        <PriceSlider
          min={filters.minPrice}
          max={filters.maxPrice}
          onChange={(min, max) => {
            onFilterChange({ ...filters, minPrice: min, maxPrice: max, page: 1 });
          }}
        />
      </Accordion>

      <Accordion title="Brand">
        <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
          {brands?.map((brand) => (
            <label key={brand.id} className="flex items-center justify-between group cursor-pointer">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={filters.brands?.includes(brand.id) || false}
                  onChange={() => toggleArrayFilter('brands', brand.id)}
                  className="w-4 h-4 rounded border-neutral-medium text-primary-500 focus:ring-primary-500"
                />
                <span className={`text-sm transition-colors ${
                  filters.brands?.includes(brand.id) 
                    ? 'text-neutral-nearBlack font-medium' 
                    : 'text-neutral-dark group-hover:text-neutral-nearBlack'
                }`}>
                  {brand.name}
                </span>
              </div>
              <span className="text-xs text-neutral-medium group-hover:text-neutral-dark transition-colors">
                ({productCounts?.brands?.[brand.id] ?? 0})
              </span>
            </label>
          ))}
        </div>
      </Accordion>

      <Accordion title="Colors">
        <div className="grid grid-cols-5 gap-3 py-2">
          {COLORS.map((color) => (
            <button
              key={color.name}
              onClick={() => toggleArrayFilter('colors', color.name)}
              title={color.name}
              className={`group relative flex flex-col items-center gap-1`}
            >
              <div
                className={`w-8 h-8 rounded-full border-2 transition-all duration-200 flex items-center justify-center ${
                  filters.colors?.includes(color.name)
                    ? 'border-primary-500 scale-110 shadow-md'
                    : 'border-transparent hover:border-neutral-medium'
                }`}
              >
                <span
                  className="w-6 h-6 rounded-full border border-black/5"
                  style={{ backgroundColor: color.hex }}
                />
                {filters.colors?.includes(color.name) && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className={`w-4 h-4 ${color.name === 'White' ? 'text-black' : 'text-white'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </Accordion>

      <Accordion title="Size">
        <div className="flex flex-wrap gap-2 py-2">
          {SIZES.map((size) => (
            <button
              key={size}
              onClick={() => toggleArrayFilter('sizes', size)}
              className={`min-w-[40px] h-10 px-3 rounded-md text-sm font-medium border transition-all duration-200 ${
                filters.sizes?.includes(size)
                  ? 'bg-primary-900 border-primary-900 text-white shadow-sm'
                  : 'bg-white border-neutral-medium text-neutral-dark hover:border-primary-500 hover:text-primary-500'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </Accordion>

      <Accordion title="Availability" isOpen={false}>
        <div className="space-y-2">
          <label className="flex items-center justify-between cursor-pointer group">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={filters.inStock || false}
                onChange={() => onFilterChange({ ...filters, inStock: !filters.inStock, page: 1 })}
                className="w-4 h-4 rounded border-neutral-medium text-primary-500 focus:ring-primary-500"
              />
              <span className="text-sm text-neutral-dark group-hover:text-neutral-nearBlack">In Stock</span>
            </div>
          </label>
          <label className="flex items-center justify-between cursor-pointer group">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={filters.outOfStock || false}
                onChange={() => onFilterChange({ ...filters, outOfStock: !filters.outOfStock, page: 1 })}
                className="w-4 h-4 rounded border-neutral-medium text-primary-500 focus:ring-primary-500"
              />
              <span className="text-sm text-neutral-dark group-hover:text-neutral-nearBlack">Out of Stock</span>
            </div>
          </label>
        </div>
      </Accordion>

      <div className="pt-6">
        <button
          onClick={resetFilters}
          className="w-full py-3 text-sm font-semibold text-primary-600 border border-primary-600 rounded-md hover:bg-primary-50 transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Clear All Filters
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Filter Trigger Button */}
      <div className="lg:hidden sticky top-[80px] z-30 bg-white/80 backdrop-blur-md border-b border-neutral-medium -mx-4 px-4 py-3 mb-6">
        <button
          onClick={() => setIsMobileDrawerOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-neutral-nearBlack text-white rounded-md text-sm font-semibold shadow-lg active:scale-95 transition-transform"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filters {Object.keys(filters).length > 0 && `(${Object.keys(filters).length})`}
        </button>
      </div>

      {/* Desktop Filters Sidebar */}
      <div className="hidden lg:block w-64 flex-shrink-0">
        <div className="sticky top-24">
          <h2 className="text-xl font-bold text-neutral-nearBlack mb-6">Filters</h2>
          <FilterContent />
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-[100] flex flex-col">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-neutral-nearBlack/60 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setIsMobileDrawerOpen(false)}
          />
          
          {/* Drawer Content - Slide up */}
          <div className="relative mt-auto h-[85vh] w-full bg-white rounded-t-3xl shadow-2xl overflow-hidden flex flex-col animate-slide-up">
            {/* Handle */}
            <div className="flex justify-center py-4">
              <div className="w-12 h-1.5 bg-neutral-medium rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 pb-4 border-b border-neutral-medium">
              <h2 className="text-xl font-bold text-neutral-nearBlack">Filters</h2>
              <button
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-2 -mr-2 text-neutral-dark hover:text-neutral-nearBlack transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable Area */}
            <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
              <FilterContent />
            </div>

            {/* Footer / Apply Button */}
            <div className="p-6 border-t border-neutral-medium bg-neutral-light">
              <button
                onClick={() => setIsMobileDrawerOpen(false)}
                className="w-full py-4 bg-neutral-nearBlack text-white rounded-xl text-base font-bold shadow-lg hover:bg-neutral-800 transition-colors"
              >
                Show Results
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Styles for animations */}
      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #F5F5F5;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #E5E5E5;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #D4D4D4;
        }
      `}</style>
    </>
  );
};

export default ProductFilters;
