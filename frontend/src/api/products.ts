import apiClient from './client';
import adminClient from './admin-client';
import type {
  Product,
  ProductListResponse,
  ProductFilters,
  CreateProductData,
  ProductVariant,
  CreateVariantData,
  ProductCountsResponse,
} from '../types/product';

export const getProducts = async (
  params?: ProductFilters,
): Promise<ProductListResponse> => {
  const { data } = await apiClient.get<ProductListResponse>('/products', {
    params,
  });
  return data;
};

export const getProduct = async (id: string): Promise<Product> => {
  const { data } = await apiClient.get<Product>(`/products/${id}`);
  return data;
};

export const getProductCounts = async (): Promise<ProductCountsResponse> => {
  const { data } = await apiClient.get<ProductCountsResponse>(
    '/products/counts/by-category',
  );
  return data;
};

export const createProduct = async (
  productData: CreateProductData,
): Promise<Product> => {
  const { data } = await adminClient.post<Product>('/products', productData);
  return data;
};

export const updateProduct = async (
  id: string,
  productData: Partial<CreateProductData>,
): Promise<Product> => {
  const { data } = await adminClient.patch<Product>(
    `/products/${id}`,
    productData,
  );
  return data;
};

export const deleteProduct = async (id: string): Promise<{ message: string }> => {
  const { data } = await adminClient.delete<{ message: string }>(`/products/${id}`);
  return data;
};

// Variant endpoints
export const getProductVariants = async (
  productId: string,
): Promise<ProductVariant[]> => {
  const { data } = await apiClient.get<ProductVariant[]>(
    `/products/${productId}/variants`,
  );
  return data;
};

export const createVariant = async (
  productId: string,
  variantData: CreateVariantData,
): Promise<ProductVariant> => {
  const { data } = await adminClient.post<ProductVariant>(
    `/products/${productId}/variants`,
    variantData,
  );
  return data;
};

export const updateVariant = async (
  id: string,
  variantData: Partial<CreateVariantData>,
): Promise<ProductVariant> => {
  const { data } = await adminClient.patch<ProductVariant>(
    `/variants/${id}`,
    variantData,
  );
  return data;
};

export const deleteVariant = async (id: string): Promise<{ message: string }> => {
  const { data } = await adminClient.delete<{ message: string }>(`/variants/${id}`);
  return data;
};

// ─── Bulk Operations (REQ-FE-010 / REQ-BE-013) ───────────────────────────

export interface BulkImportResult {
  imported: number;
  errors: number;
  total: number;
  details?: { row: number; message: string }[];
}

export interface BulkUpdateItem {
  productId: string;
  basePrice?: number;
  salePrice?: number | null;
  stock?: number;
  isActive?: boolean;
  isFeatured?: boolean;
}

export interface BulkUpdateResult {
  updated: number;
  errors: number;
  total: number;
  details?: { productId: string; message: string }[];
}

/**
 * Bulk import products from a CSV file.
 * POST /api/products/bulk/import (multipart form-data).
 * SEC-09: File validated server-side (MIME type, 5MB limit).
 */
export async function bulkImportProducts(file: File): Promise<BulkImportResult> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await adminClient.post<BulkImportResult>('/products/bulk/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60_000, // 60s for large CSV uploads
  });
  return data;
}

/**
 * Bulk update multiple products at once (price, stock, status).
 * POST /api/products/bulk/update (JSON body).
 * Backend contract: { updates: [{ productId, basePrice?, salePrice?, stock?, isActive?, isFeatured? }] }
 */
export async function bulkUpdateProducts(updates: BulkUpdateItem[]): Promise<BulkUpdateResult> {
  const { data } = await adminClient.post<BulkUpdateResult>('/products/bulk/update', { updates });
  return data;
}

/**
 * Export products as Excel file (Blob download).
 * GET /api/products/export
 */
export async function exportProducts(): Promise<Blob> {
  const { data } = await adminClient.get('/products/export', {
    responseType: 'blob',
    timeout: 30_000,
  });
  return data;
}
