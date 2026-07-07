import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useProduct } from '../../hooks/useProducts';
import ProductInfo from './components/ProductInfo';
import ProductReviews from './components/ProductReviews';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { data: product, isLoading, error } = useProduct(id!);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

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
  const currentImage = images[selectedImageIndex] || null;

  return (
    <div className="container-page py-8">
      <div className="lg:grid lg:grid-cols-2 lg:gap-12">
        <div className="mb-8 lg:mb-0">
          {/* Main Image */}
          <div
            className="relative w-full aspect-[3/4] rounded-lg overflow-hidden bg-gray-100 cursor-crosshair"
            onMouseEnter={() => setIsZoomed(true)}
            onMouseLeave={() => setIsZoomed(false)}
          >
            {currentImage ? (
              <img
                src={currentImage}
                alt={product.name}
                loading="lazy"
                className={`w-full h-full object-cover transition-transform duration-300 ${
                  isZoomed ? 'scale-150' : 'scale-100'
                }`}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-gray-400">No Image</span>
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="mt-4 flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Product images">
              {images.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}
                  role="tab"
                  aria-selected={selectedImageIndex === index}
                  aria-label={`View image ${index + 1}`}
                  className={`flex-shrink-0 w-16 h-20 rounded-md overflow-hidden border-2 transition-all duration-200 ${
                    selectedImageIndex === index
                      ? 'border-primary-500 ring-1 ring-primary-500'
                      : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <img
                    src={img}
                    alt={`${product.name} ${index + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
        <ProductInfo product={product} />
      </div>

      <div className="mt-16">
        <ProductReviews productId={id} />
      </div>
    </div>
  );
};

export default ProductDetail;
