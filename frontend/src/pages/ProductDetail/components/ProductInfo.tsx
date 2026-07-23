import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import { formatCurrency } from '../../../utils/formatCurrency';
import { useCart } from '../../../hooks/useCart';
import { useWishlist } from '../../../hooks/useWishlist';
import type { Product, ProductVariant } from '../../../types/product';
import SizeGuide from '../../../components/common/SizeGuide';
import { ROUTES } from '../../../utils/constants';

// Constants
const MAX_CART_QUANTITY = 10;

interface ProductInfoProps {
  product: Product;
}

const Accordion = ({ 
  title, 
  children, 
  isOpen: defaultOpen = false 
}: { 
  title: string; 
  children: React.ReactNode; 
  isOpen?: boolean 
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-neutral-medium py-5">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-sm font-semibold text-neutral-nearBlack uppercase tracking-widest">
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
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-[500px] opacity-100 mt-4' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="text-body-small text-neutral-dark leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
};

const ProductInfo = ({ product }: ProductInfoProps) => {
  const navigate = useNavigate();
  
  // Local state for variant selection and quantity
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [purchaseType, setPurchaseType] = useState<'sale' | 'rent'>('sale');

  // Hooks for cart and wishlist
  const { addItem: addToCart, isAdding } = useCart();
  const { addItem: addToWishlist, isAdding: isAddingWishlist } = useWishlist();

  // Size Guide modal state
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);

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

  // Helper function to get available colors for a specific size
  const getAvailableColorsForSize = (size: string): string[] => {
    if (!size) return [];
    return product.variants
      ?.filter(v => v.isActive && v.size === size && v.color)
      .map(v => v.color) || [];
  };

  // Handle size selection
  const handleSizeSelect = (size: string) => {
    setSelectedSize(size);
    
    const availableColors = getAvailableColorsForSize(size);
    
    // Only reset color if the currently selected color is not available in the new size
    if (!selectedColor || !availableColors.includes(selectedColor)) {
      setSelectedColor(null);
    }
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

  // Handle Buy Now (Add to cart and redirect to checkout)
  const handleBuyNow = async () => {
     if (!selectedVariant) {
      toast.error('Please select a size and color');
      return;
    }
    // Add to cart first, then redirect to checkout
    await addToCart(selectedVariant.id, quantity, purchaseType);
    navigate(ROUTES.CHECKOUT);
  }

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
    <div className="flex flex-col h-full">
      {/* Breadcrumb - Simple for now */}
      <nav className="flex items-center gap-2 text-caption text-neutral-dark mb-6">
        <Link to="/" className="hover:text-primary-500 transition-colors">Home</Link>
        <span className="text-neutral-medium">/</span>
        <Link to="/shop" className="hover:text-primary-500 transition-colors">Shop</Link>
        <span className="text-neutral-medium">/</span>
        <span className="text-neutral-nearBlack truncate max-w-[150px]">{product.name}</span>
      </nav>

      {/* Badges */}
      <div className="flex gap-2 mb-4">
        {showSaleBadge && (
          <Badge variant="danger" className="rounded-full px-4 py-1">SALE -{discountPercentage}%</Badge>
        )}
        {showNewArrivalBadge && <Badge variant="info" className="rounded-full px-4 py-1">NEW ARRIVAL</Badge>}
        {showRentableBadge && <Badge variant="success" className="rounded-full px-4 py-1">RENTABLE</Badge>}
      </div>

      {/* Product Name */}
      <h1 className="text-3xl lg:text-4xl font-display font-bold text-neutral-nearBlack mb-3">
        {product.name}
      </h1>

      {/* Brand & Category */}
      <div className="flex items-center gap-3 mb-6">
        {product.brand?.name && (
          <span className="text-sm font-semibold text-neutral-dark uppercase tracking-widest border-r border-neutral-medium pr-3">
            {product.brand.name}
          </span>
        )}
        <span className="text-sm text-neutral-dark">
          {product.category?.name}
        </span>
      </div>

      {/* Price Display */}
      <div className="mb-8">
        <div className="flex items-baseline gap-4">
          <span className="text-3xl font-bold text-neutral-nearBlack">
            {formatCurrency(displayPrice)}
          </span>
          {hasDiscount && (
            <span className="text-xl text-neutral-medium line-through">
              {formatCurrency(originalPrice)}
            </span>
          )}
        </div>
        
        {product.isRentable && purchaseType === 'rent' && selectedVariant?.rentPricePerDay && (
          <div className="mt-2 p-3 bg-primary-50 rounded-lg border border-primary-100">
            <p className="text-sm font-medium text-primary-700">
              Rental Price: <span className="text-lg font-bold">{formatCurrency(selectedVariant.rentPricePerDay)}</span> / day
            </p>
            {selectedVariant.securityDeposit && (
              <p className="text-xs text-primary-600 mt-1">
                + Security Deposit: {formatCurrency(selectedVariant.securityDeposit)} (Refundable)
              </p>
            )}
          </div>
        )}
      </div>

      {/* Purchase Type Selector */}
      {product.isRentable && product.isSellable && (
        <div className="mb-8 p-1 bg-neutral-light rounded-xl flex gap-1">
          <button
            onClick={() => setPurchaseType('sale')}
            className={`flex-1 py-3 px-4 rounded-lg text-sm font-bold transition-all duration-300 ${
              purchaseType === 'sale'
                ? 'bg-white text-neutral-nearBlack shadow-sm'
                : 'text-neutral-dark hover:text-neutral-nearBlack'
            }`}
          >
            BUY FOR OWN
          </button>
          <button
            onClick={() => setPurchaseType('rent')}
            className={`flex-1 py-3 px-4 rounded-lg text-sm font-bold transition-all duration-300 ${
              purchaseType === 'rent'
                ? 'bg-white text-neutral-nearBlack shadow-sm'
                : 'text-neutral-dark hover:text-neutral-nearBlack'
            }`}
          >
            RENT FOR EVENTS
          </button>
        </div>
      )}

      <div className="space-y-8 mb-10">
        {/* Size Selector */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-neutral-nearBlack uppercase tracking-wider">
              Select Size
            </h3>
            <button
              type="button"
              onClick={() => setIsSizeGuideOpen(true)}
              className="text-xs font-semibold text-primary-500 hover:underline"
            >
              Size Guide
            </button>
          </div>
          {sizes.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {sizes.map((size) => (
                <button
                  key={size}
                  onClick={() => handleSizeSelect(size)}
                  className={`min-w-[56px] h-12 px-4 rounded-lg text-sm font-bold border-2 transition-all duration-300 ${
                    selectedSize === size
                      ? 'bg-neutral-nearBlack border-neutral-nearBlack text-white shadow-lg translate-y-[-2px]'
                      : 'bg-white border-neutral-medium text-neutral-dark hover:border-neutral-nearBlack hover:text-neutral-nearBlack'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-medium">No sizes available</p>
          )}
        </div>

        {/* Color Selector */}
        {sizes.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-neutral-nearBlack uppercase tracking-wider">
                Select Color
              </h3>
              {selectedColor && (
                <span className="text-sm text-neutral-dark">{selectedColor}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              {(selectedSize ? colorsForSize : Array.from(new Set(product.variants?.map(v => v.color).filter(Boolean)))).map((color) => (
                <button
                  key={color}
                  onClick={() => handleColorSelect(color!)}
                  className={`group relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-200 ${
                    selectedColor === color
                      ? 'border-primary-500 scale-110'
                      : 'border-neutral-medium hover:border-neutral-dark'
                  }`}
                  title={color!}
                >
                  <span className="w-9 h-9 rounded-full bg-neutral-light border border-black/5 flex items-center justify-center overflow-hidden">
                    {/* Placeholder for actual color hex/image if available, otherwise just text/initial */}
                    <span className="text-[10px] font-bold text-neutral-dark uppercase">{color?.substring(0, 2)}</span>
                  </span>
                  {selectedColor === color && (
                    <div className="absolute -top-1 -right-1 bg-primary-500 text-white rounded-full p-0.5 shadow-sm">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quantity & Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center justify-between border-2 border-neutral-medium rounded-xl p-1 h-14 sm:w-32">
            <button
              onClick={decreaseQuantity}
              disabled={quantity <= 1}
              className="w-10 h-full flex items-center justify-center text-neutral-nearBlack hover:bg-neutral-light rounded-lg disabled:opacity-30 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
            </button>
            <span className="text-lg font-bold text-neutral-nearBlack w-8 text-center">{quantity}</span>
            <button
              onClick={increaseQuantity}
              disabled={quantity >= 10}
              className="w-10 h-full flex items-center justify-center text-neutral-nearBlack hover:bg-neutral-light rounded-lg disabled:opacity-30 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            </button>
          </div>

          <Button
            size="lg"
            className="flex-1 h-14 bg-neutral-nearBlack text-white hover:bg-neutral-800 rounded-xl font-bold uppercase tracking-wider shadow-lg active:scale-95 transition-all"
            onClick={handleAddToCart}
            isLoading={isAdding}
            disabled={isOutOfStock || !canAddToCart}
          >
            {isOutOfStock ? 'Out of Stock' : 'Add to Bag'}
          </Button>
          
          <button
            onClick={handleWishlist}
            className={`w-14 h-14 flex items-center justify-center border-2 rounded-xl transition-all duration-300 ${
              isAddingWishlist ? 'opacity-50' : 'hover:bg-red-50 hover:border-red-200 group'
            } border-neutral-medium`}
            disabled={!canAddToCart}
            aria-label="Add to wishlist"
          >
            <svg
              className={`w-6 h-6 transition-colors duration-300 ${isAddingWishlist ? 'text-neutral-medium' : 'text-neutral-nearBlack group-hover:text-red-500'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </button>
        </div>
        
        <Button
          variant="outline"
          size="lg"
          className="w-full h-14 border-neutral-nearBlack text-neutral-nearBlack hover:bg-neutral-nearBlack hover:text-white rounded-xl font-bold uppercase tracking-wider transition-all"
          onClick={handleBuyNow}
          disabled={isOutOfStock || !canAddToCart}
        >
          Buy Now
        </Button>
      </div>

      {/* Info Accordions */}
      <div className="mt-4">
        <Accordion title="Product Description" isOpen={true}>
          <p className="mb-4">{product.description}</p>
          <ul className="list-disc pl-5 space-y-1">
            {product.fabric && <li><span className="font-semibold">Fabric:</span> {product.fabric}</li>}
            {product.hsnCode && <li><span className="font-semibold">HSN Code:</span> {product.hsnCode}</li>}
            <li><span className="font-semibold">Category:</span> {product.category?.name}</li>
            <li><span className="font-semibold">SKU:</span> {product.variants?.[0]?.sku || 'N/A'}</li>
          </ul>
        </Accordion>

        <Accordion title="Care Instructions">
          <p>{product.careInstructions || "Dry clean only. Handle with care to maintain the fabric quality and intricate detailing."}</p>
        </Accordion>

        <Accordion title="Shipping & Returns">
          <p className="mb-3 font-semibold text-neutral-nearBlack">Standard Delivery: 5-7 business days</p>
          <p className="mb-4">Free shipping on orders above {formatCurrency(5000)}. We offer a 7-day hassle-free return policy for unused items with original tags intact.</p>
          <p className="mb-2 font-semibold text-neutral-nearBlack">Rental Period & Deposits:</p>
          <p>Rentals are for a 48-hour period. Security deposit is fully refundable upon return of the garment in original condition.</p>
        </Accordion>
      </div>

      {/* Social Share */}
      <div className="mt-8 flex items-center gap-4">
        <span className="text-xs font-bold text-neutral-dark uppercase tracking-widest">Share:</span>
        <div className="flex gap-3">
          {['facebook', 'twitter', 'instagram', 'pinterest'].map(platform => (
            <button key={platform} className="text-neutral-dark hover:text-primary-500 transition-colors">
              <span className="sr-only">Share on {platform}</span>
              <div className="w-8 h-8 rounded-full bg-neutral-light flex items-center justify-center">
                 {/* Replace with actual icons */}
                 <span className="text-[10px] uppercase font-bold">{platform[0]}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Size Guide Modal */}
      <SizeGuide
        isOpen={isSizeGuideOpen}
        onClose={() => setIsSizeGuideOpen(false)}
        category="women"
      />
    </div>
  );
};

export default ProductInfo;
