import { useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { Product, ProductVariant } from '../../types/product';
import { formatCurrencyCompact } from '../../utils/formatCurrency';
import { imageUrl } from '../../utils/imageUrl';
import { useWishlist } from '../../hooks/useWishlist';
import { useUIStore } from '../../store/uiStore';
import { useCompareStore } from '../../store/compareStore';
import { ROUTES } from '../../utils/constants';
import ProductBadge from './ProductBadge';
import ColorSwatches from './ColorSwatches';
import QuickActions from './QuickActions';
import RateStars from './RateStars';
import DealTimer from './DealTimer';
import SizeSelector, { ProductSize } from './SizeSelector';

// Additional interfaces for enhanced features
interface ProductSize {
  size: string;
  variantId: string;
}

interface ProductColor {
  color: string;
  hex?: string;
  imageUrl?: string;
}

// Extract color data from product variants
const extractColorsFromVariants = (variants?: any[]): ProductColor[] => {
  if (!variants || variants.length === 0) return [];
  
  const colorMap = new Map<string, ProductColor>();
  
  variants.forEach(variant => {
    if (variant.color && !colorMap.has(variant.color)) {
      colorMap.set(variant.color, {
        color: variant.color,
        hex: variant.colorHex || undefined,
        imageUrl: variant.images?.[0]?.url || undefined,
      });
    }
  });
  
  return Array.from(colorMap.values());
};

// Extract sizes from product variants with stock info
const extractSizesFromVariants = (variants?: ProductVariant[]): ProductSize[] => {
  if (!variants || variants.length === 0) return [];
  
  return variants
    .filter(variant => variant.isActive && variant.size && variant.stock > 0)
    .map(variant => ({
      size: variant.size,
      variantId: variant.id,
      stock: variant.stock,
    }));
};

// Find variant by size selection
const findVariantBySize = (variants: ProductVariant[], size: string): ProductVariant | undefined => {
  return variants.find(v => v.isActive && v.size === size);
};

// Get stock for default variant
const getVariantStock = (variant?: ProductVariant): number => {
  return variant?.stock ?? 0;
};

// Helper function to get rating from product metadata
const getProductRating = (product: Product): number => {
  // Placeholder - in a real app, this would come from reviews
  // Randomly assign ratings to some products for demo
  if (product.id.length % 4 === 0) return 4.5;
  if (product.id.length % 3 === 0) return 4.0;
  if (product.id.length % 2 === 0) return 3.5;
  return 0;
};

const ProductCard = ({ product }: { product: Product }) => {
  const navigate = useNavigate();
  const openQuickView = useUIStore((state) => state.openQuickView);
  const { addItem: addToWishlist, items: wishlistItems, removeItem: removeFromWishlist } = useWishlist();
  const [isHovered, setIsHovered] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [selectedSize, setSelectedSize] = useState<ProductSize | null>(null);

  // Extract variants data
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

  const hasSalePrice = product.salePrice !== undefined && product.salePrice < product.basePrice;

  // Get all available images
  const primaryImage = imageUrl(product.images?.[0], product.version);
  const hasMultipleImages = (product.images?.length ?? 0) > 1;
  const secondaryImage = hasMultipleImages ? imageUrl(product.images![1], product.version) : null;
  const hasAlternateImage = secondaryImage !== null && secondaryImage !== primaryImage;

  const rating = getProductRating(product);
  const reviewCount = rating > 0 ? Math.floor(Math.random() * 50) + 10 : 0; // Demo data
  
  // Brand name from product
  const brandName = product.brand?.name || product.category?.name || '';

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
    // If color has associated image, we could update the displayed image here
    // For now, this is a placeholder for the color selection action
  }, []);

  const handleSizeSelect = useCallback((size: ProductSize) => {
    const variant = findVariantBySize(product.variants, size.size);
    setSelectedSize(size);
    setSelectedVariant(variant);
  }, [product.variants]);

  const handleSizeQuickAdd = useCallback((size: string, variantId: string) => {
    const variant = product.variants.find(v => v.id === variantId);
    if (!variant || variant.stock <= 0) {
      toast.error('This size is out of stock');
      return;
    }
    setSelectedSize({ size, variantId, stock: variant.stock });
    setSelectedVariant(variant);
    toast.success(`Size ${size} selected. Click Add to Cart to confirm.`);
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

  // Mobile touch fallback for image swap
  const shouldShowSecondaryImage = isHovered && currentImageIndex > 0;

  return (
    <div
      className="w-full bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 relative group"
      onMouseEnter={() => !isTouchDevice && setIsHovered(true)}
      onMouseLeave={() => !isTouchDevice && setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Image Container with Enhanced Hover Effects */}
      <div className="relative overflow-hidden bg-gray-50 aspect-[3/4]">
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
          <svg
            className={`w-5 h-5 ${isWishlisted ? 'text-red-500' : 'text-gray-600'}`}
            viewBox="0 0 24 24"
            fill={isWishlisted ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
            />
          </svg>
        </button>

        {/* Product Images with Hover Swap */}
        <Link
          to={ROUTES.PRODUCT_DETAIL(product.id)}
          className="block w-full h-full relative"
        >
          <img
            src={primaryImage}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            decoding="async"
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
          sizes={sizes.length > 0 ? sizes : undefined}
          onAddToCartWithSize={handleSizeQuickAdd}
          isVisible={isHovered || isTouchDevice}
        />

        {/* Deal Timer */}
        {product.saleEndDate && hasSalePrice && (
          <div className="absolute bottom-2 left-2 right-2 z-20">
            <DealTimer endDate={product.saleEndDate} variant="compact" />
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="px-3 py-4 flex flex-col items-center text-center">
        {/* Brand Name */}
        {brandName && (
          <Link
            to={ROUTES.PRODUCT_DETAIL(product.id)}
            className="text-[10px] text-neutral-dark uppercase tracking-widest mb-1 hover:text-primary-600 transition-colors"
          >
            {brandName}
          </Link>
        )}
        
        {/* Color Swatches */}
        <ColorSwatches
          colors={colors}
          onColorSelect={handleColorChange}
          className="mb-2"
        />

        {/* Product Title */}
        <Link
          to={ROUTES.PRODUCT_DETAIL(product.id)}
          className="block w-full mb-1"
        >
          <h3 className="text-sm md:text-product-title text-primary-900 font-bold line-clamp-2 min-h-[2.5rem] group-hover:text-primary-600 transition-colors">
            {product.name}
          </h3>
        </Link>

        {/* Rating */}
        {rating > 0 && (
          <div className="mb-2">
            <RateStars 
              rating={rating} 
              reviewCount={reviewCount} 
              size="sm" 
            />
          </div>
        )}

        {/* Price with strikethrough for sale items */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm md:text-product-price font-bold text-primary-900">
            {formatCurrencyCompact(product.salePrice ?? product.basePrice)}
          </span>
          {hasSalePrice && (
            <span className="text-xs text-neutral-dark line-through opacity-60">
              {formatCurrencyCompact(product.basePrice)}
            </span>
          )}
        </div>

        {/* View Details Button - Simplified for Homepage Cards */}
        <button
          onClick={() => navigate(ROUTES.PRODUCT_DETAIL(product.id))}
          className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-lg transition-colors duration-200"
          aria-label={`View details for ${product.name}`}
        >
          View Details
        </button>
      </div>
    </div>
  );
};

export default ProductCard;