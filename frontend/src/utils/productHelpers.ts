import type { Product, ProductVariant } from '../types/product';

export interface ProductColor {
  color: string;
  hex?: string;
  imageUrl?: string;
}

export interface ProductSize {
  size: string;
  variantId: string;
  stock?: number;
}

/**
 * Extract unique colors from product variants.
 */
export const extractColorsFromVariants = (variants?: any[]): ProductColor[] => {
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

/**
 * Extract sizes from product variants with stock info.
 */
export const extractSizesFromVariants = (variants?: ProductVariant[]): ProductSize[] => {
  if (!variants || variants.length === 0) return [];

  return variants
    .filter(variant => variant.isActive && variant.size && (variant.stock ?? 0) > 0)
    .map(variant => ({
      size: variant.size,
      variantId: variant.id,
      stock: variant.stock ?? 0,
    }));
};

/**
 * Calculate discount percentage between base and sale price.
 */
export const getDiscountPercent = (basePrice: number, salePrice?: number): number => {
  if (!salePrice || salePrice >= basePrice) return 0;
  return Math.round(((basePrice - salePrice) / basePrice) * 100);
};

/**
 * Check if a product currently has an active sale.
 */
export const hasActiveSale = (product: Product): boolean => {
  return (
    product.salePrice !== undefined &&
    product.salePrice < product.basePrice &&
    (!product.saleEndDate || new Date(product.saleEndDate) > new Date())
  );
};

/**
 * Get pseudo-random rating for demo purposes.
 */
export const getProductRating = (product: Product): number => {
  if (product.id.length % 4 === 0) return 4.5;
  if (product.id.length % 3 === 0) return 4.0;
  if (product.id.length % 2 === 0) return 3.5;
  return 0;
};
