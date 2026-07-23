export interface ProductImage {
  id: string;
  url: string;
  altText?: string;
  sortOrder: number;
  storageKey?: string;
  variantType: 'ORIGINAL' | 'MEDIUM' | 'THUMBNAIL';
  width?: number;
  height?: number;
  fileSize?: number;
  mimeType?: string;
  parentImageId?: string;
  variants?: ProductImage[];
}

export interface ProductVariant {
  id: string;
  productId: string;
  size: string;
  color: string;
  sku: string;
  barcode?: string;
  salePrice?: number;
  rentPricePerDay?: number;
  securityDeposit?: number;
  weightGrams?: number;
  isActive: boolean;
  images: ProductImage[];
  createdAt?: string;
  updatedAt?: string;
}

import type { Category } from './category';
import type { Brand } from './brand';

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  basePrice: number;
  salePrice?: number;
  images: string[];
  stock: number;
  isFeatured: boolean;
  isActive: boolean;
  isRentable: boolean;
  isSellable: boolean;
  saleEndDate?: string;
  fabric?: string;
  hsnCode?: string;
  careInstructions?: string;
  sortPriority: number;
  categoryId: string;
  category?: Category;
  brandId?: string;
  brand?: Brand;
  variants: ProductVariant[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductListResponse {
  items: Product[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ProductFilters {
  page?: number;
  limit?: number;
  categoryId?: string;
  brandId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  minPrice?: number;
  maxPrice?: number;
  isFeatured?: boolean;
  isNew?: boolean;
  isBestSeller?: boolean;
  isOnSale?: boolean;
  sizes?: string[];
  colors?: string[];
  brands?: string[];
  inStockOnly?: boolean;
  onSale?: boolean;
  inStock?: boolean;
  outOfStock?: boolean;
}

export type ProductCountMap = Record<string, number>;

export interface ProductCountsResponse {
  categories: ProductCountMap;
  brands: ProductCountMap;
  inStock: number;
  outOfStock: number;
}

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
  disabled?: boolean;
}

export interface CreateProductData {
  name: string;
  slug?: string;
  description?: string;
  basePrice: number;
  salePrice?: number;
  categoryId: string;
  brandId?: string;
  fabric?: string;
  hsnCode?: string;
  isRentable?: boolean;
  isSellable?: boolean;
  isFeatured?: boolean;
  isActive?: boolean;
  careInstructions?: string;
  sortPriority?: number;
}

export interface CreateVariantData {
  size: string;
  color: string;
  sku: string;
  barcode?: string;
  salePrice?: number;
  rentPricePerDay?: number;
  securityDeposit?: number;
  initialStock?: { storeId: string; quantity: number }[];
}
