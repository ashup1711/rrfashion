import apiClient from './client';

export interface SaleProduct {
  id: string;
  name: string;
  slug: string;
  images: string[];
  basePrice: number;
  salePrice: number;
  discountPercent: number;
  fabric?: string;
  category: { id: string; name: string };
  variants: Array<{ id: string; size: string; color: string; salePrice?: number }>;
}

export interface SaleProductsResponse {
  items: SaleProduct[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface SaleFilters {
  categoryId?: string;
  brandId?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const getSaleProducts = async (filters?: SaleFilters): Promise<SaleProductsResponse> => {
  const { data } = await apiClient.get<SaleProductsResponse>('/products/on-sale', { params: filters });
  return data;
};
