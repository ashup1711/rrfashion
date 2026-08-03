import { Helmet } from 'react-helmet-async';
import type { Product } from '../../types/product';
import { resolveImageUrl } from '../../utils/constants';

interface ProductSeoHeadProps {
  product: Product;
}

/**
 * ProductSeoHead — REQ-FE-011
 *
 * React Helmet component that sets SEO meta tags for product detail pages.
 * - Title, description, og:image from product SEO fields
 * - Canonical URL
 * - Open Graph tags for social sharing
 * - Twitter Card tags
 *
 * SEC-08: No dangerouslySetInnerHTML — all content is React-rendered via Helmet
 * which safely handles meta tag content.
 */
const ProductSeoHead = ({ product }: ProductSeoHeadProps) => {
  // Use SEO fields if available, fallback to product data
  const title = product.metaTitle || `${product.name} | RR Fashion`;
  const description =
    product.metaDescription ||
    product.description?.slice(0, 160) ||
    `Shop ${product.name} at RR Fashion. ${product.isRentable ? 'Available for rent.' : ''} ${product.salePrice ? `Sale price: ₹${product.salePrice}` : ''}`;

  // Build canonical URL
  const canonicalUrl = product.canonicalUrl
    || (typeof window !== 'undefined'
      ? `${window.location.origin}/products/${product.slug || product.id}`
      : '');

  // Build OG image URL
  const ogImageUrl = product.ogImage
    || (product.images?.[0] ? resolveImageUrl(product.images[0]) : '');

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="product" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      {ogImageUrl && <meta property="og:image" content={ogImageUrl} />}
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      <meta property="og:site_name" content="RR Fashion" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {ogImageUrl && <meta name="twitter:image" content={ogImageUrl} />}

      {/* Product-specific */}
      <meta property="product:price:amount" content={String(product.salePrice || product.basePrice)} />
      <meta property="product:price:currency" content="INR" />
    </Helmet>
  );
};

export default ProductSeoHead;
