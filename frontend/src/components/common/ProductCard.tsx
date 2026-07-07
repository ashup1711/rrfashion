import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { Product } from '../../types/product';
import { formatCurrencyCompact } from '../../utils/formatCurrency';
import { useWishlist } from '../../hooks/useWishlist';
import { ROUTES } from '../../utils/constants';

interface ProductCardProps {
  product: Product;
}

const HeartIcon = ({ filled }: { filled: boolean }) => (
  <svg
    className={`w-5 h-5 ${filled ? 'text-red-500' : 'text-gray-400'}`}
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

const ProductCard = ({ product }: ProductCardProps) => {
  const navigate = useNavigate();
  const { addItem: addToWishlist, items: wishlistItems, removeItem: removeFromWishlist } = useWishlist();
  const [isHovered, setIsHovered] = useState(false);

  const imageUrl = product.images?.[0] || '/images/placeholder.svg';
  const firstVariant = product.variants?.find((v) => v.isActive);
  const isWishlisted = firstVariant
    ? wishlistItems.some((item) => item.variantId === firstVariant.id)
    : false;

  const hasSalePrice = product.salePrice != null && product.salePrice < product.basePrice;
  const discountPercent = hasSalePrice
    ? Math.round(((product.basePrice - product.salePrice!) / product.basePrice) * 100)
    : 0;

  const handleAddToCart = useCallback(() => {
    navigate(ROUTES.PRODUCT_DETAIL(product.id));
  }, [navigate, product.id]);

  const handleWishlistToggle = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!firstVariant) return;

      if (isWishlisted) {
        removeFromWishlist(firstVariant.id);
        toast.success('Removed from wishlist');
      } else {
        addToWishlist(firstVariant.id);
      }
    },
    [firstVariant, isWishlisted, addToWishlist, removeFromWishlist],
  );

  return (
    <div
      className="w-product-card h-product-card bg-white flex flex-col group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Badges */}
      <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
        {hasSalePrice && (
          <span className="bg-error text-white text-xs font-semibold px-2 py-0.5 rounded">
            {discountPercent}% OFF
          </span>
        )}
        {product.isFeatured && (
          <span className="bg-info text-white text-xs font-semibold px-2 py-0.5 rounded">
            NEW
          </span>
        )}
      </div>

      {/* Wishlist Heart Button */}
      <button
        onClick={handleWishlistToggle}
        className={`absolute top-2 right-2 z-20 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm shadow-sm flex items-center justify-center transition-all duration-200 hover:bg-white hover:shadow-md ${
          isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        } group-hover:opacity-100 group-hover:scale-100`}
        aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
      >
        <HeartIcon filled={isWishlisted} />
      </button>

      <Link
        to={ROUTES.PRODUCT_DETAIL(product.id)}
        className="block h-product-image overflow-hidden"
      >
        <img
          src={imageUrl}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
      </Link>
      <div className="flex flex-col items-center justify-between flex-1 px-4 py-3">
        <Link to={ROUTES.PRODUCT_DETAIL(product.id)}>
          <h3 className="font-sans text-card-title text-gray-800 text-center truncate max-w-[279px]">
            {product.name}
          </h3>
        </Link>

        {/* Price with strikethrough for sale items */}
        <div className="flex items-center gap-2 mt-1">
          <span className="font-sans font-semibold text-price text-primary-600">
            {formatCurrencyCompact(product.salePrice ?? product.basePrice)}
          </span>
          {hasSalePrice && (
            <span className="font-sans text-sm text-gray-400 line-through">
              {formatCurrencyCompact(product.basePrice)}
            </span>
          )}
        </div>

        <button
          onClick={handleAddToCart}
          className="w-[279px] h-[34px] bg-mauve text-white text-button font-medium rounded-[4px] mt-2 hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-mauve focus:ring-offset-2"
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
