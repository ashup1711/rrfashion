import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import { formatCurrency } from '../../../utils/formatCurrency';
import { useCart } from '../../../hooks/useCart';
import { useWishlist } from '../../../hooks/useWishlist';
import { useAuthStore } from '../../../store/authStore';
import type { Product, ProductVariant } from '../../../types/product';

// Constants
const MAX_CART_QUANTITY = 10;

interface ProductInfoProps {
  product: Product;
}

const ProductInfo = ({ product }: ProductInfoProps) => {
  // Local state for variant selection and quantity
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [purchaseType, setPurchaseType] = useState<'sale' | 'rent'>('sale');

  // Hooks for cart and wishlist
  const { addItem: addToCart, isAdding } = useCart();
  const { addItem: addToWishlist, isAdding: isAddingWishlist } = useWishlist();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Extract unique sizes from variants
  const sizes = useMemo(() => {
    const sizeSet = new Set<string>();
    product.variants?.forEach((variant) => {
      if (variant.isActive && variant.size) {
        sizeSet.add(variant.size);
      }
    });
    return Array.from(sizeSet);
  }, [product.variants]);

  // Get colors available for selected size
  const colorsForSize = useMemo(() => {
    if (!selectedSize) return [];
    const colorSet = new Set<string>();
    product.variants?.forEach((variant) => {
      if (variant.isActive && variant.size === selectedSize && variant.color) {
        colorSet.add(variant.color);
      }
    });
    return Array.from(colorSet);
  }, [product.variants, selectedSize]);

  // Find selected variant
  const selectedVariant = useMemo<ProductVariant | null>(() => {
    if (!selectedSize || !selectedColor) return null;
    return (
      product.variants?.find(
        (v) => v.isActive && v.size === selectedSize && v.color === selectedColor,
      ) || null
    );
  }, [product.variants, selectedSize, selectedColor]);

  // Price display logic
  const displayPrice = useMemo(() => {
    if (selectedVariant?.salePrice) {
      return selectedVariant.salePrice;
    }
    if (product.salePrice) {
      return product.salePrice;
    }
    return product.basePrice;
  }, [selectedVariant, product.salePrice, product.basePrice]);

  const originalPrice = product.basePrice;
  const hasDiscount = displayPrice < originalPrice;
  const discountPercentage = hasDiscount
    ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100)
    : 0;

  // Determine if product can be added to cart
  const canAddToCart = selectedVariant !== null;
  const isOutOfStock = product.variants?.every((v) => !v.isActive) || product.variants?.length === 0;

  // Handle size selection
  const handleSizeSelect = (size: string) => {
    setSelectedSize(size);
    setSelectedColor(null); // Reset color when size changes
  };

  // Handle color selection
  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
  };

  // Handle quantity changes
  const decreaseQuantity = () => {
    setQuantity((q) => Math.max(1, q - 1));
  };

  const increaseQuantity = () => {
    setQuantity((q) => Math.min(MAX_CART_QUANTITY, q + 1));
  };

  // Handle Add to Cart
  const handleAddToCart = async () => {
    if (!selectedVariant) {
      toast.error('Please select a size and color');
      return;
    }

    addToCart(selectedVariant.id, quantity, purchaseType);
  };

  // Handle Wishlist
  const handleWishlist = async () => {
    if (!selectedVariant) {
      toast.error('Please select a size and color first');
      return;
    }

    addToWishlist(selectedVariant.id, true);
  };

  // Determine which badges to show
  const showSaleBadge = product.salePrice && product.salePrice < product.basePrice;
  const showNewArrivalBadge = product.isFeatured && !showSaleBadge;
  const showRentableBadge = product.isRentable;

  return (
    <div>
      {/* Badges */}
      <div className="flex gap-2">
        {showSaleBadge && (
          <Badge variant="danger">Sale {discountPercentage}% Off</Badge>
        )}
        {showNewArrivalBadge && <Badge variant="info">New Arrival</Badge>}
        {showRentableBadge && <Badge variant="success">Rentable</Badge>}
      </div>

      {/* Product Name */}
      <h1 className="mt-3 text-3xl font-bold text-gray-900">{product.name}</h1>

      {/* Category and Brand */}
      <div className="mt-2 flex items-center gap-2">
        {product.category?.name && (
          <p className="text-lg text-gray-500">{product.category.name}</p>
        )}
        {product.brand?.name && (
          <>
            <span className="text-gray-300">|</span>
            <p className="text-lg text-gray-500">{product.brand.name}</p>
          </>
        )}
      </div>

      {/* Price Display */}
      <div className="mt-6">
        <div className="flex items-center gap-3">
          <p className="text-3xl font-bold text-primary-600">
            {formatCurrency(displayPrice)}
          </p>
          {hasDiscount && (
            <p className="text-lg text-gray-400 line-through">
              {formatCurrency(originalPrice)}
            </p>
          )}
        </div>
        {/* Show rent price if rentable and viewing rent option */}
        {product.isRentable && purchaseType === 'rent' && selectedVariant?.rentPricePerDay && (
          <p className="mt-1 text-sm text-gray-500">
            Rent: {formatCurrency(selectedVariant.rentPricePerDay)}/day
            {selectedVariant.securityDeposit && (
              <span className="ml-2">
                (Security Deposit: {formatCurrency(selectedVariant.securityDeposit)})
              </span>
            )}
          </p>
        )}
      </div>

      {/* Description */}
      {product.description && (
        <p className="mt-6 text-gray-600 leading-relaxed">{product.description}</p>
      )}

      {/* Product Type Selector (for products that are both rentable and sellable) */}
      {product.isRentable && product.isSellable && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Purchase Type</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setPurchaseType('sale')}
              className={`px-4 py-2 border rounded-md text-sm font-medium transition-colors ${
                purchaseType === 'sale'
                  ? 'border-primary-500 text-primary-600 bg-primary-50'
                  : 'border-gray-300 text-gray-700 hover:border-primary-500'
              }`}
            >
              Buy
            </button>
            <button
              onClick={() => setPurchaseType('rent')}
              className={`px-4 py-2 border rounded-md text-sm font-medium transition-colors ${
                purchaseType === 'rent'
                  ? 'border-primary-500 text-primary-600 bg-primary-50'
                  : 'border-gray-300 text-gray-700 hover:border-primary-500'
              }`}
            >
              Rent
            </button>
          </div>
        </div>
      )}

      {/* Size Selector */}
      <div className="mt-8">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Size {selectedSize && <span className="font-normal text-gray-500">({selectedSize})</span>}
        </h3>
        {sizes.length > 0 ? (
          <div className="flex gap-2 flex-wrap" role="radiogroup" aria-label="Select size">
            {sizes.map((size) => (
              <button
                key={size}
                onClick={() => handleSizeSelect(size)}
                role="radio"
                aria-checked={selectedSize === size}
                className={`min-w-[40px] h-10 px-3 border rounded-md text-sm font-medium transition-colors ${
                  selectedSize === size
                    ? 'border-primary-500 text-primary-600 bg-primary-50'
                    : 'border-gray-300 text-gray-700 hover:border-primary-500 hover:text-primary-600'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No sizes available</p>
        )}
      </div>

      {/* Color Selector */}
      {selectedSize && colorsForSize.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Color {selectedColor && <span className="font-normal text-gray-500">({selectedColor})</span>}
          </h3>
          <div className="flex gap-2 flex-wrap" role="radiogroup" aria-label="Select color">
            {colorsForSize.map((color) => (
              <button
                key={color}
                onClick={() => handleColorSelect(color)}
                role="radio"
                aria-checked={selectedColor === color}
                className={`px-4 h-10 border rounded-md text-sm font-medium transition-colors ${
                  selectedColor === color
                    ? 'border-primary-500 text-primary-600 bg-primary-50'
                    : 'border-gray-300 text-gray-700 hover:border-primary-500 hover:text-primary-600'
                }`}
              >
                {color}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quantity Selector */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Quantity</h3>
        <div className="flex items-center gap-3">
          <button
            onClick={decreaseQuantity}
            disabled={quantity <= 1}
            className="w-8 h-8 border border-gray-300 rounded-md flex items-center justify-center text-gray-600 hover:border-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Decrease quantity"
          >
            -
          </button>
          <span className="text-lg font-medium text-gray-900 w-8 text-center">{quantity}</span>
          <button
            onClick={increaseQuantity}
            disabled={quantity >= 10}
            className="w-8 h-8 border border-gray-300 rounded-md flex items-center justify-center text-gray-600 hover:border-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-8 flex gap-4">
        <Button
          size="lg"
          className="flex-1"
          onClick={handleAddToCart}
          isLoading={isAdding}
          disabled={isOutOfStock || !canAddToCart}
        >
          {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={handleWishlist}
          isLoading={isAddingWishlist}
          disabled={!canAddToCart}
          aria-label="Add to wishlist"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        </Button>
      </div>

      {/* Selection Prompt */}
      {!canAddToCart && !isOutOfStock && (
        <p className="mt-4 text-sm text-amber-600">
          Please select a size and color to continue
        </p>
      )}

      {/* Guest user sign-in prompt */}
      {!isAuthenticated && canAddToCart && (
        <p className="mt-3 text-xs text-gray-500">
          <Link to="/auth/login" className="text-primary-600 hover:underline">
            Sign in
          </Link>{' '}
          to save your cart across devices
        </p>
      )}

      {/* Product Details */}
      <div className="mt-10 border-t border-gray-200 pt-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Product Details</h3>
        <dl className="space-y-3">
          {product.fabric && (
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Fabric</dt>
              <dd className="text-sm text-gray-900">{product.fabric}</dd>
            </div>
          )}
          {product.careInstructions && (
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Care Instructions</dt>
              <dd className="text-sm text-gray-900 text-right max-w-[200px]">
                {product.careInstructions}
              </dd>
            </div>
          )}
          {product.hsnCode && (
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">HSN Code</dt>
              <dd className="text-sm text-gray-900">{product.hsnCode}</dd>
            </div>
          )}
          {product.stock !== undefined && (
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Availability</dt>
              <dd className="text-sm text-gray-900">
                {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
              </dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
};

export default ProductInfo;
