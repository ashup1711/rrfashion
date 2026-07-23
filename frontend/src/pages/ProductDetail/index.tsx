import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useProduct, useProducts } from '../../hooks/useProducts';
import { useRecentlyViewed } from '../../hooks/useRecentlyViewed';
import ProductInfo from './components/ProductInfo';
import ProductReviews from './components/ProductReviews';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ProductCard from '../../components/common/ProductCard';
import RecentlyViewed from '../../components/common/RecentlyViewed';
import Breadcrumb from '../../components/common/Breadcrumb';
import type { Category } from '../../types/category';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Autoplay } from 'swiper/modules';
import type { Product } from '../../types/product';
import { ROUTES } from '../../utils/constants';
import { imageUrl } from '../../utils/imageUrl';
import 'swiper/css';
import 'swiper/css/navigation';

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { data: product, isLoading, error } = useProduct(id!);
  const { addProduct } = useRecentlyViewed();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    if (product) {
      addProduct(product);
    }
  }, [product, addProduct]);

  if (!id) {
    return (
      <div className="container-page py-8">
        <p className="text-gray-500">Product not found.</p>
      </div>
    );
  }

  if (isLoading) return <LoadingSpinner />;
  if (error || !product) {
    return (
      <div className="container-page py-8">
        <p className="text-gray-500">Product not found.</p>
      </div>
    );
  }

  const images = product.images?.length > 0 ? product.images : [];
  const currentImage = images[selectedImageIndex]
    ? imageUrl(images[selectedImageIndex], product.version)
    : null;

  return (
    <div className="container-page py-page-section">
      <Breadcrumb items={buildBreadcrumbItems(product.category, product.name)} />

      <div className="lg:grid lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-7 mb-8 lg:mb-0">
          <div className="flex flex-col-reverse lg:flex-row gap-4">
            {/* Thumbnails - Vertical on Desktop */}
            {images.length > 1 && (
              <div className="flex lg:flex-col gap-3 overflow-x-auto lg:overflow-y-auto lg:h-[600px] no-scrollbar py-2 lg:py-0" role="tablist" aria-label="Product images">
                {images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    role="tab"
                    aria-selected={selectedImageIndex === index}
                    aria-label={`View image ${index + 1}`}
                    className={`flex-shrink-0 w-20 h-24 lg:w-24 lg:h-32 rounded-md overflow-hidden border-2 transition-all duration-200 ${
                      selectedImageIndex === index
                        ? 'border-primary-500'
                        : 'border-neutral-medium hover:border-neutral-dark'
                    }`}
                  >
                    <img
                      src={imageUrl(img, product.version)}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Main Image with Improved Zoom */}
            <div
              className="relative flex-1 aspect-[3/4] rounded-xl overflow-hidden bg-neutral-light cursor-zoom-in group"
              onMouseEnter={() => setIsZoomed(true)}
              onMouseLeave={() => setIsZoomed(false)}
            >
              {currentImage ? (
                <img
                  src={currentImage}
                  alt={product.name}
                  loading="lazy"
                  className={`w-full h-full object-cover transition-transform duration-500 ease-out ${
                    isZoomed ? 'scale-125' : 'scale-100'
                  }`}
                  style={{
                    transformOrigin: 'center center',
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-neutral-dark">No Image</span>
                </div>
              )}

              {/* Overlay for better visual feedback */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300 pointer-events-none" />
            </div>
          </div>
        </div>
        
        <div className="lg:col-span-5">
          <ProductInfo product={product} />
        </div>
      </div>

      <div className="mt-20">
        <ProductReviews productId={id} />
      </div>

      {/* Recently Viewed */}
      <div className="mt-20">
        <RecentlyViewed />
      </div>

      {/* Related Products Section */}
      <div className="mt-20 border-t border-neutral-medium pt-16">
        <RelatedProducts categoryId={product.categoryId} currentProductId={product.id} />
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

// Internal RelatedProducts component
const RelatedProducts = ({ categoryId, currentProductId }: { categoryId: string, currentProductId: string }) => {
  const { data, isLoading } = useProducts({ categoryId, limit: 10 });
  const relatedProducts: Product[] = data?.items?.filter((p: Product) => p.id !== currentProductId) || [];

  if (isLoading || relatedProducts.length === 0) return null;

  return (
    <div>
      <h2 className="text-section-title font-display text-neutral-nearBlack mb-10 text-center">
        You May Also Like
      </h2>
      <div className="relative group">
        <Swiper
          modules={[Navigation, Autoplay]}
          spaceBetween={24}
          slidesPerView={2}
          autoplay={{
            delay: 4000,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
          }}
          navigation={{
            nextEl: '.related-next',
            prevEl: '.related-prev',
          }}
          breakpoints={{
            640: { slidesPerView: 2 },
            768: { slidesPerView: 3 },
            1024: { slidesPerView: 4 },
          }}
          className="related-products-slider"
        >
          {relatedProducts.map((product: Product) => (
            <SwiperSlide key={product.id}>
              <ProductCard product={product} />
            </SwiperSlide>
          ))}
        </Swiper>
        
        {/* Navigation Buttons - Hidden by default, show on group hover */}
        <button className="related-prev absolute left-[-20px] top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center text-neutral-nearBlack opacity-0 group-hover:opacity-100 group-hover:left-[-10px] transition-all duration-300 border border-neutral-medium">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <button className="related-next absolute right-[-20px] top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center text-neutral-nearBlack opacity-0 group-hover:opacity-100 group-hover:right-[-10px] transition-all duration-300 border border-neutral-medium">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
    </div>
  );
};


export default ProductDetail;

// Build a breadcrumb trail from a product's category chain (root → leaf → product)
const buildBreadcrumbItems = (category?: Category | null, productName?: string) => {
  if (!category) return [{ label: productName || 'Products', path: ROUTES.SHOP }];

  // Walk up the parent chain to collect the full path
  const chain: Category[] = [];
  let current: Category | null | undefined = category;
  while (current) {
    chain.unshift(current);
    current = current.parent;
  }

  return [
    ...chain.map((cat) => ({
      label: cat.name,
      path: ROUTES.SHOP_CATEGORY(cat.slug),
    })),
    { label: productName || 'Product' },
  ];
};
