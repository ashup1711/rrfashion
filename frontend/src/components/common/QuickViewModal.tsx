import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Thumbs, FreeMode } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '../../store/uiStore';
import { useCartStore } from '../../store/cartStore';
import { formatCurrencyCompact } from '../../utils/formatCurrency';
import { ROUTES } from '../../utils/constants';
import { toast } from 'sonner';
import { useFocusTrap } from '../../hooks/useFocusTrap';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/thumbs';
import 'swiper/css/free-mode';

const QuickViewModal = () => {
  const { isQuickViewOpen, quickViewProduct: product, closeQuickView, openMiniCart } = useUIStore();
  const addItem = useCartStore((state) => state.addItem);
  const navigate = useNavigate();
  
  const [thumbsSwiper, setThumbsSwiper] = useState<SwiperType | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  const panelRef = useFocusTrap<HTMLDivElement>(isQuickViewOpen, { onEscape: closeQuickView });

  // Sync animation state with isOpen
  useEffect(() => {
    if (isQuickViewOpen) {
      setShouldRender(true);
      document.body.style.overflow = 'hidden';
      const timer = setTimeout(() => setIsAnimating(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(false);
      document.body.style.overflow = '';
      const timer = setTimeout(() => setShouldRender(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isQuickViewOpen]);

  // Reset local state when product changes
  useEffect(() => {
    if (product) {
      setSelectedSize('');
      setSelectedColor(product.variants?.[0]?.color || '');
      setQuantity(1);
    }
  }, [product]);

  const colors = useMemo(() => {
    if (!product?.variants) return [];
    const colorMap = new Map();
    product.variants.forEach((v) => {
      if (!colorMap.has(v.color)) {
        colorMap.set(v.color, {
          color: v.color,
          hex: v.color.toLowerCase() === 'white' ? '#FFFFFF' : 
               v.color.toLowerCase() === 'black' ? '#000000' : 
               v.color.toLowerCase() === 'red' ? '#FF0000' : undefined
        });
      }
    });
    return Array.from(colorMap.values());
  }, [product]);

  const sizes = useMemo(() => {
    if (!product?.variants || !selectedColor) return [];
    return product.variants
      .filter((v) => v.color === selectedColor && v.isActive)
      .map((v) => v.size);
  }, [product, selectedColor]);

  const stockLevel = useMemo(() => {
    if (!product) return 'out';
    if (product.stock === 0) return 'out';
    if (product.stock <= 3) return 'low';
    return 'in';
  }, [product]);

  if (!shouldRender || !product) return null;

  const handleAddToCart = () => {
    if (!selectedSize) {
      toast.error('Please select a size');
      return;
    }

    const variant = product.variants.find(
      (v) => v.color === selectedColor && v.size === selectedSize
    );

    if (!variant) {
      toast.error('Selected variant not available');
      return;
    }

    addItem({
      productId: product.id,
      variantId: variant.id,
      name: product.name,
      basePrice: product.basePrice,
      salePrice: product.salePrice,
      image: product.images[0] || '',
      quantity: quantity,
      type: 'sale',
    });

    toast.success('Added to cart');
    closeQuickView();
    openMiniCart();
  };

  const handleBuyItNow = () => {
    if (!selectedSize) {
      toast.error('Please select a size');
      return;
    }

    const variant = product.variants.find(
      (v) => v.color === selectedColor && v.size === selectedSize
    );

    if (!variant) {
      toast.error('Selected variant not available');
      return;
    }

    addItem({
      productId: product.id,
      variantId: variant.id,
      name: product.name,
      basePrice: product.basePrice,
      salePrice: product.salePrice,
      image: product.images[0] || '',
      quantity: quantity,
      type: 'sale',
    });

    closeQuickView();
    navigate(ROUTES.CHECKOUT);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeQuickView();
    }
  };

  const images = product.images.length > 0 ? product.images : ['/images/placeholder.svg'];

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-end overflow-hidden"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Slide-in Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Quick product view"
        className={`relative w-full max-w-4xl h-full bg-white shadow-2xl transition-transform duration-500 ease-out transform overflow-y-auto md:overflow-hidden ${
          isAnimating ? 'translate-x-0' : 'translate-x-full'
        } flex flex-col md:flex-row`}
      >
        {/* Close Button */}
        <button
          onClick={closeQuickView}
          className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/80 hover:bg-white shadow-md transition-all hover:scale-105"
          aria-label="Close"
        >
          <svg className="w-6 h-6 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Left: Image Gallery */}
        <div className="w-full md:w-1/2 h-[400px] md:h-full bg-gray-50 flex flex-col p-4 md:p-8">
          <div className="relative flex-1 min-h-0">
            <Swiper
              style={{
                '--swiper-navigation-color': '#000',
                '--swiper-pagination-color': '#000',
              } as any}
              spaceBetween={10}
              navigation={true}
              thumbs={{ swiper: thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : null }}
              modules={[FreeMode, Navigation, Thumbs]}
              className="h-full rounded-lg"
            >
              {images.map((img, idx) => (
                <SwiperSlide key={idx} className="flex items-center justify-center bg-white overflow-hidden group">
                  <div className="relative w-full h-full overflow-hidden">
                    <img 
                      src={img} 
                      alt={`${product.name} - ${idx + 1}`}
                      className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-150 cursor-zoom-in"
                    />
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
          
          {/* Thumbnails */}
          <div className="mt-4 h-20">
            <Swiper
              onSwiper={setThumbsSwiper}
              spaceBetween={10}
              slidesPerView={4}
              freeMode={true}
              watchSlidesProgress={true}
              modules={[FreeMode, Navigation, Thumbs]}
              className="h-full"
            >
              {images.map((img, idx) => (
                <SwiperSlide key={idx} className="cursor-pointer rounded border-2 border-transparent aria-selected:border-primary-500 transition-all overflow-hidden bg-white">
                  <img src={img} alt="Thumbnail" className="w-full h-full object-cover" />
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>

        {/* Right: Product Details */}
        <div className="w-full md:w-1/2 p-6 md:p-12 overflow-y-auto">
          <div className="flex flex-col h-full">
            {product.brand && (
              <span className="text-sm font-medium text-neutral-dark uppercase tracking-widest mb-2">
                {product.brand.name}
              </span>
            )}
            <h2 className="text-2xl md:text-3xl font-serif text-gray-900 mb-2">{product.name}</h2>
            
            {/* Stock Indicator */}
            <AnimatePresence>
              {stockLevel === 'low' && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs font-semibold text-warning flex items-center gap-1 mb-2"
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Only {product.stock} left in stock!
                </motion.p>
              )}
              {stockLevel === 'out' && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs font-semibold text-error flex items-center gap-1 mb-2"
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  Out of Stock
                </motion.p>
              )}
            </AnimatePresence>

            {/* Price */}
            <div className="flex items-center gap-4 mb-4">
              <span className="text-2xl font-semibold text-primary-600">
                {formatCurrencyCompact(product.salePrice ?? product.basePrice)}
              </span>
              {product.salePrice && product.salePrice < product.basePrice && (
                <span className="text-lg text-gray-400 line-through">
                  {formatCurrencyCompact(product.basePrice)}
                </span>
              )}
            </div>

            {/* Reviews Summary */}
            <div className="flex items-center gap-2 mb-6">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    className="w-4 h-4 text-primary-500 fill-primary-500"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>
                ))}
              </div>
              <span className="text-caption text-neutral-dark">(12 reviews)</span>
            </div>

            <p className="text-gray-600 mb-8 line-clamp-3 leading-relaxed">
              {product.description || 'No description available for this product.'}
            </p>

            {/* Selectors */}
            <div className="space-y-6 mb-8">
              {/* Color Selector */}
              <div>
                <span className="block text-sm font-semibold text-gray-900 mb-3">
                  Color: <span className="font-normal text-gray-500 capitalize">{selectedColor}</span>
                </span>
                <div className="flex flex-wrap gap-2">
                  {colors.map((c) => (
                    <button
                      key={c.color}
                      onClick={() => setSelectedColor(c.color)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        selectedColor === c.color
                          ? 'border-primary-500 scale-110 shadow-md'
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                      style={{
                        backgroundColor: c.hex || '#ccc',
                      }}
                      aria-label={`Select ${c.color} color`}
                      title={c.color}
                    />
                  ))}
                </div>
              </div>

              {/* Size Selector */}
              <div>
                <span className="block text-sm font-semibold text-gray-900 mb-3">
                  Size: <span className="font-normal text-gray-500">{selectedSize || 'Select a size'}</span>
                </span>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`min-w-[44px] h-10 px-3 flex items-center justify-center border text-sm font-medium transition-all rounded-md ${
                        selectedSize === size
                          ? 'bg-neutral-nearBlack text-white border-neutral-nearBlack shadow-sm'
                          : 'bg-white text-gray-900 border-gray-200 hover:border-gray-900 hover:shadow-sm'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                  {sizes.length === 0 && (
                    <span className="text-sm text-gray-400 italic">No sizes available for this color</span>
                  )}
                </div>
              </div>

              {/* Quantity Selector */}
              <div>
                <span className="block text-sm font-semibold text-gray-900 mb-3">Quantity</span>
                <div className="flex items-center w-32 border border-gray-200 h-10 rounded-md overflow-hidden">
                  <button
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="flex-1 flex items-center justify-center hover:bg-gray-50 transition-colors h-full"
                    aria-label="Decrease quantity"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </button>
                  <span className="flex-1 flex items-center justify-center text-sm font-medium border-x border-gray-200 h-full">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(q => q + 1)}
                    className="flex-1 flex items-center justify-center hover:bg-gray-50 transition-colors h-full"
                    aria-label="Increase quantity"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-auto space-y-3 pt-6 border-t border-gray-100">
              <button
                onClick={handleAddToCart}
                disabled={product.stock === 0}
                className={`w-full py-4 rounded-lg font-semibold text-white transition-all ${
                  product.stock === 0
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-primary-500 hover:bg-primary-600 shadow-md hover:shadow-lg active:scale-[0.98]'
                }`}
              >
                {product.stock === 0 ? 'OUT OF STOCK' : 'ADD TO CART'}
              </button>

              <button
                onClick={handleBuyItNow}
                disabled={product.stock === 0}
                className={`w-full py-4 rounded-lg font-semibold transition-all ${
                  product.stock === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-neutral-nearBlack text-white hover:bg-neutral-800 shadow-sm hover:shadow-md active:scale-[0.98]'
                }`}
              >
                BUY IT NOW
              </button>
               
              <Link
                to={ROUTES.PRODUCT_DETAIL(product.id)}
                onClick={closeQuickView}
                className="block w-full text-center py-2 text-sm font-medium text-gray-500 hover:text-primary-500 transition-colors"
              >
                View Full Details
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickViewModal;
