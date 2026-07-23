import { useState } from 'react';
import { useUIStore } from '../../store/uiStore';

const HeartIcon = ({ filled }: { filled: boolean }) => (
  <svg
    className={`w-4 h-4 ${filled ? 'text-red-500' : 'text-gray-600'}`}
    viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
    />
  </svg>
);

const EyeIcon = () => (
  <svg
    className="w-4 h-4 text-gray-600"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"
    />
    <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CompareIcon = () => (
  <svg
    className="w-4 h-4 text-gray-600"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 3l6 6-6 6" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 3l6 6-6 6" />
  </svg>
);

interface ProductSize {
  size: string;
  variantId: string;
}

interface QuickActionsProps {
  isWishlisted: boolean;
  onToggleWishlist: (e: React.MouseEvent) => void;
  onQuickView: (e: React.MouseEvent) => void;
  onCompare: (e: React.MouseEvent) => void;
  sizes?: ProductSize[];
  onAddToCartWithSize: (size: string, variantId: string) => void;
  isVisible: boolean;
}

const QuickActions = ({
  isWishlisted,
  onToggleWishlist,
  onQuickView,
  onCompare,
  sizes,
  onAddToCartWithSize,
  isVisible,
}: QuickActionsProps) => {
  const [selectedSize, setSelectedSize] = useState<string>('');
  const openMiniCart = useUIStore((state) => state.openMiniCart);

  const handleSizeSelect = (size: string, variantId: string) => {
    setSelectedSize(size);
    onAddToCartWithSize(size, variantId);
    openMiniCart();
  };

  const baseButtonClasses = 
    'w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm shadow-sm flex items-center justify-center transition-all duration-200 hover:bg-white hover:shadow-md hover:scale-105';

  return (
    <div className={`absolute left-0 right-0 bottom-0 z-20 flex items-center justify-center gap-2 px-4 py-3 transition-all duration-300 ${
      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full md:opacity-0 md:translate-y-full'
    }`}>
      {/* Wishlist Button */}
      <button
        onClick={onToggleWishlist}
        className={baseButtonClasses}
        aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
      >
        <HeartIcon filled={isWishlisted} />
      </button>

      {/* Quick View Button */}
      <button
        onClick={onQuickView}
        className={baseButtonClasses}
        aria-label="Quick view"
      >
        <EyeIcon />
      </button>

      {/* Compare Button */}
      <button
        onClick={onCompare}
        className={baseButtonClasses}
        aria-label="Add to compare"
      >
        <CompareIcon />
      </button>

      {/* Size Selector */}
      {sizes && sizes.length > 0 && (
        <select
          value={selectedSize}
          onChange={(e) => {
            const [size, variantId] = e.target.value.split('|');
            handleSizeSelect(size, variantId);
          }}
          className="text-xs bg-white/90 backdrop-blur-sm border border-gray-300 rounded-md px-2 py-1 shadow-sm hover:bg-white hover:border-gray-400 transition-colors"
          aria-label="Quick add size"
          defaultValue=""
        >
          <option value="" disabled>
            Size
          </option>
          {sizes.map(({ size, variantId }) => (
            <option key={variantId} value={`${size}|${variantId}`}>
              {size}
            </option>
          ))}
        </select>
      )}
    </div>
  );
};

export default QuickActions;