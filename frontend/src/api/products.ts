import apiClient from './client';
import adminClient from './admin-client';
import type {
  Product,
  ProductListResponse,
  ProductFilters,
  CreateProductData,
  ProductVariant,
  CreateVariantData,
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
