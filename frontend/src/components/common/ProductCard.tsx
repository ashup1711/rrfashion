import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { Product } from '../../types/product';
import { formatCurrencyCompact } from '../../utils/formatCurrency';
import { imageUrl, placeholderUrl } from '../../utils/imageUrl';
import { useWishlist } from '../../hooks/useWishlist';
import { useUIStore } from '../../store/uiStore';
import { useCompareStore } from '../../store/compareStore';
import { ROUTES } from '../../utils/constants';
import {
  extractColorsFromVariants,
  extractSizesFromVariants,
  getDiscountPercent,
  hasActiveSale,
  getProductRating,
  type ProductColor,
} from '../../utils/productHelpers';
import ProductBadge from './ProductBadge';
import ColorSwatches from './ColorSwatches';
import { HeartIcon, HeartFilledIcon } from './Icons';
import QuickActions from './QuickActions';
import RateStars from './RateStars';
import DealTimer from './DealTimer';
import AddToCartButton from './AddToCartButton';

export interface ProductCardProps {
  product: Product;
  className?: string;
  style?: React.CSSProperties;
  variant?: 'standard' | 'compact' | 'minimal';
  /** S-013: Optional custom renderer for the product name (e.g., for search highlighting) */
  nameRenderer?: (name: string) => React.ReactNode;
}

const ProductCard = ({ product, className = '', style, variant = 'standard', nameRenderer }: ProductCardProps) => {
  const navigate = useNavigate();
  const openQuickView = useUIStore((state) => state.openQuickView);
  const { addItem: addToWishlist, items: wishlistItems, removeItem: removeFromWishlist } = useWishlist();
  const [isHovered, setIsHovered] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Extract variants data using shared helpers
  const colors = useMemo(() => {
    return extractColorsFromVariants(product.variants);
  }, [product.variants]);

  const sizes = useMemo(() => {
    return extractSizesFromVariants(product.variants);
  }, [product.variants]);

  const firstVariant = product.variants?.find((v) => v.isActive);
  const isWishlisted = firstVariant
    ? wishlistItems.some((item) => item.variantId === firstVariant.id)
    : false;

  const saleActive = hasActiveSale(product);

  // Get all available images
  const primaryImage = imageUrl(product.images?.[0], product.version);
  const placeholderSrc = product.images?.[0] ? placeholderUrl(product.images[0]) : undefined;
  const hasMultipleImages = (product.images?.length ?? 0) > 1;
  const secondaryImage = hasMultipleImages ? imageUrl(product.images![1], product.version) : null;
  const hasAlternateImage = secondaryImage !== null && secondaryImage !== primaryImage;

  const rating = useMemo(() => getProductRating(product), [product]);
  const reviewCount = useMemo(() => rating > 0 ? Math.floor(Math.random() * 50) + 10 : 0, [rating]);

  // Brand name from product
  const brandName = product.brand?.name || product.category?.name || '';

  const discountPercent = useMemo(
    () => getDiscountPercent(product.basePrice, product.salePrice),
    [product.basePrice, product.salePrice]
  );

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
        toast.success('Added to wishlist');
      }
    },
    [firstVariant, isWishlisted, addToWishlist, removeFromWishlist]
  );

  const handleQuickView = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openQuickView(product);
  }, [openQuickView, product]);

  const handleCompare = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    useCompareStore.getState().addItem(product);
  }, [product]);

  const handleColorChange = useCallback((index: number, _color: ProductColor) => {
    setCurrentImageIndex(index);
  }, []);

  const handleAddToCart = useCallback(async (variantId: string) => {
    const variant = product.variants.find(v => v.id === variantId);
    if (!variant || (variant.stock ?? 0) <= 0) {
      toast.error('This item is out of stock');
      return;
    }
    // In a real app, this would call the cart API
    // For now, simulate a short delay
    await new Promise(resolve => setTimeout(resolve, 800));
  }, [product.variants]);

  // Touch handlers for mobile
  const handleTouchStart = () => {
    setIsTouchDevice(true);
  };

  const handleTouchEnd = () => {
    if (isTouchDevice) {
      setIsHovered(!isHovered);
    }
  };

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigate(ROUTES.PRODUCT_DETAIL(product.id));
    }
  }, [navigate, product.id]);

  // Mobile touch fallback for image swap
  const shouldShowSecondaryImage = isHovered && currentImageIndex > 0;

  // Reset image loaded state when primary image changes
  useEffect(() => {
    setImageLoaded(false);
  }, [primaryImage]);

  const getCTA = () => {
    if (variant === 'minimal') {
      return (
        <Link
          to={ROUTES.PRODUCT_DETAIL(product.id)}
          className="text-caption text-primary-600 hover:text-primary-700 font-medium transition-colors"
        >
          View Details →
        </Link>
      );
    }

    if (sizes.length === 1) {
      return (
        <AddToCartButton
          variantId={sizes[0].variantId}
          onAddToCart={handleAddToCart}
          size={variant === 'compact' ? 'sm' : 'md'}
          variant="accent"
        />
      );
    }

    return (
      <button
        onClick={() => navigate(ROUTES.PRODUCT_DETAIL(product.id))}
        className={`w-full border border-primary-200 text-primary-700 hover:bg-primary-50 font-medium rounded-lg transition-colors duration-200 text-sm ${
          variant === 'compact' ? 'py-1.5 px-3' : 'py-2.5'
        }`}
        aria-label={`View options for ${product.name}`}
      >
        View Options
      </button>
    );
  };

  return (
    <div
      ref={cardRef}
      className={`
        w-full bg-white rounded-xl overflow-hidden
        border border-neutral-medium/30 shadow-sm
        hover:shadow-lg hover:border-primary-200 hover:-translate-y-1
        transition-all duration-300 relative group
        focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2
        ${className}
      `}
      style={{ containerType: 'inline-size', ...style }}
      onMouseEnter={() => !isTouchDevice && setIsHovered(true)}
      onMouseLeave={() => !isTouchDevice && setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="article"
      aria-label={`Product: ${product.name}`}
    >
      {/* Image Container with Enhanced Hover Effects */}
      <div className="relative overflow-hidden bg-primary-50 aspect-[3/4]">
        {/* Badges */}
        <ProductBadge product={product} />

        {/* Wishlist Button - Fixed position on mobile, animated on desktop */}
        <button
          onClick={handleWishlistToggle}
          className={`absolute top-2 right-2 z-20 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm shadow-sm flex items-center justify-center transition-all duration-200 hover:bg-white hover:shadow-md hover:scale-105 ${
            isHovered || isTouchDevice ? 'opacity-100 scale-100' : 'opacity-0 scale-95 md:opacity-0 md:scale-95'
          }`}
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          {isWishlisted ? (
            <HeartFilledIcon className="text-red-500" size={20} />
          ) : (
            <HeartIcon className="text-neutral-dark" size={20} />
          )}
        </button>

        {/* Product Images with Hover Swap and Blur-up */}
        <Link
          to={ROUTES.PRODUCT_DETAIL(product.id)}
          className="block w-full h-full relative"
          aria-hidden="true"
        >
          {/* Blur-up placeholder */}
          {placeholderSrc && !imageLoaded && (
            <img
              src={placeholderSrc}
              alt=""
              className="absolute inset-0 w-full h-full object-cover blur-sm scale-105"
              aria-hidden="true"
            />
          )}

          {/* Primary image */}
          <img
            src={primaryImage}
            alt={product.name}
            className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            loading="lazy"
            decoding="async"
            onLoad={() => setImageLoaded(true)}
            sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw"
          />

          {/* Secondary image overlay on hover */}
          {hasAlternateImage && (
            <img
              src={secondaryImage!}
              alt={`${product.name} - alternate view`}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                shouldShowSecondaryImage || (isHovered && !isTouchDevice)
                  ? 'opacity-100'
                  : 'opacity-0'
              }`}
              loading="lazy"
              decoding="async"
              sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw"
            />
          )}
        </Link>

        {/* Quick Actions Overlay */}
        <QuickActions
          isWishlisted={isWishlisted}
          onToggleWishlist={handleWishlistToggle}
          onQuickView={handleQuickView}
          onCompare={handleCompare}
          isVisible={isHovered || isTouchDevice}
          variant={variant === 'compact' ? 'compact' : 'standard'}
        />
      </div>

      {/* Deal Timer bar - sits between image and info section */}
      {product.saleEndDate && saleActive && (
        <div className="w-full">
          <DealTimer endDate={product.saleEndDate} variant="compact" />
        </div>
      )}

      {/* Product Info Section - restructured: Brand → Title → Price → Color Swatches → Rating → CTA */}
      <div className="px-card-padding py-4 flex flex-col items-start text-left min-h-[220px]">
        {/* Brand Name */}
        {brandName && (
          <Link
            to={ROUTES.PRODUCT_DETAIL(product.id)}
            className="text-neutral-dark/60 tracking-wider uppercase text-[10px] mb-1 hover:text-primary-600 transition-colors"
          >
            {brandName}
          </Link>
        )}

        {/* Product Title */}
        <Link
          to={ROUTES.PRODUCT_DETAIL(product.id)}
          className="block w-full mb-2"
        >
          <h3 className="text-product-title font-semibold text-primary-900 line-clamp-2 min-h-[2.5rem] group-hover:text-primary-600 transition-colors">
            {nameRenderer ? nameRenderer(product.name) : product.name}
          </h3>
        </Link>

        {/* Price — more prominent */}
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-product-price font-bold text-primary-900">
            {formatCurrencyCompact(product.salePrice ?? product.basePrice)}
          </span>
          {saleActive && (
            <>
              <span className="text-caption text-neutral-dark line-through opacity-60">
                {formatCurrencyCompact(product.basePrice)}
              </span>
              <span className="text-caption font-semibold text-error ml-1">
                {discountPercent}% OFF
              </span>
            </>
          )}
        </div>

        {/* Color Swatches — moved after price */}
        {colors.length > 0 && (
          <ColorSwatches
            colors={colors}
            onColorSelect={handleColorChange}
            className="mb-2"
          />
        )}

        {/* Rating */}
        {rating > 0 && (
          <div className="mb-3">
            <RateStars
              rating={rating}
              reviewCount={reviewCount}
              size="sm"
              isDemo={true}
            />
          </div>
        )}

        {/* Quick Add / CTA section */}
        {variant !== 'compact' && (
          <div className="w-full mt-auto pt-2">
            {getCTA()}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductCard;
