import { useState, useRef, useEffect, useCallback } from 'react';
import type { ImgHTMLAttributes } from 'react';
import { imageUrl, placeholderUrl, generateSrcSet } from '../../utils/imageUrl';

// Inline SVG for broken image fallback
const BROKEN_IMAGE_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 24 24' fill='%23d1d5db'%3E%3Cpath d='M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z'/%3E%3C/svg%3E`;

interface LazyImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet'> {
  src: string;
  alt: string;
  /** Low-resolution thumbnail URL (for blur-up effect) */
  placeholderSrc?: string;
  /** Image proxy resize widths for srcSet */
  widths?: number[];
  className?: string;
  fallbackSrc?: string;
  /** Image container aspect ratio (e.g., "aspect-square", "aspect-[4/3]") */
  aspectRatio?: string;
}

const LazyImage = ({
  src,
  alt,
  placeholderSrc,
  widths = [300, 800, 2000],
  className = '',
  fallbackSrc = BROKEN_IMAGE_SVG,
  aspectRatio,
  ...imgProps
}: LazyImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver for lazy loading
  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }, // Start loading 200px before visible
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    setHasError(false);
  }, []);

  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoaded(true); // Mark as "loaded" so we show the fallback
  }, []);

  // Generate srcSet from proxy endpoint
  const srcSet = isInView && !hasError && src && !src.startsWith('data:') && !src.startsWith('blob:')
    ? generateSrcSet(src, widths)
    : undefined;

  // Determine which src to show
  const imgSrc = hasError
    ? fallbackSrc
    : (isInView ? imageUrl(src, undefined) : undefined);

  // Determine sizes attribute for responsive images
  const sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';

  // Generate placeholder URL from the main src
  const lowResPlaceholder = placeholderSrc || (src ? placeholderUrl(src) : '');

  return (
    <div
      ref={imgRef}
      className={`relative overflow-hidden bg-gray-100 ${aspectRatio || ''} ${className}`}
      style={{ minHeight: '100px' }}
      role="img"
      aria-label={alt}
    >
      {/* Low-res placeholder while loading (blur-up) */}
      {!isLoaded && lowResPlaceholder && !hasError && (
        <img
          src={imageUrl(lowResPlaceholder, undefined)}
          alt=""
          className="absolute inset-0 w-full h-full object-cover blur-lg scale-110"
          aria-hidden="true"
        />
      )}

      {/* Loading skeleton shimmer when no placeholder */}
      {!isLoaded && !lowResPlaceholder && !hasError && (
        <div className="absolute inset-0 bg-gray-100 animate-pulse" />
      )}

      {/* Main image — only rendered when in view */}
      {imgSrc && (
        <img
          {...imgProps}
          src={imgSrc}
          srcSet={srcSet}
          sizes={srcSet ? sizes : undefined}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={`w-full h-full object-cover transition-opacity duration-500 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          loading="lazy"
        />
      )}

      {/* Accessible loading state for screen readers */}
      {!isLoaded && !hasError && (
        <span className="sr-only">Loading image...</span>
      )}

      {/* Accessible error state for screen readers */}
      {hasError && (
        <span className="sr-only" role="alert">Image failed to load</span>
      )}
    </div>
  );
};

export default LazyImage;
export { BROKEN_IMAGE_SVG };
