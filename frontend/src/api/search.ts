import { apiClient } from './client';

export interface SearchResultItem {
  id: string;
  name: string;
  slug: string;
  description?: string;
  basePrice: number;
  salePrice?: number;
  images: string[];
  stock: number;
  isRentable: boolean;
  isSellable: boolean;
  categoryId?: string;
  brandId?: string;
  rank?: number;
}

export interface SearchResponse {
  items: SearchResultItem[];
  total: number;
  page: number;
  limit: number;
  query: string;
}

export interface SearchParams {
  q: string;
  page?: number;
  limit?: number;
  category?: string;
  inStock?: boolean;
}

/**
 * Search products via full-text search endpoint.
 * Uses GET /api/search with query params.
 * SEC-14: Search results are public catalog data — may be cached.
 */
export async function searchProducts(
  params: SearchParams,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  const { q, page = 1, limit = 20, category, inStock } = params;
  const queryParams = new URLSearchParams({ q, page: String(page), limit: String(limit) });
  if (category) queryParams.set('category', category);
  if (inStock !== undefined) queryParams.set('inStock', String(inStock));

  const { data } = await apiClient.get<SearchResponse>(`/search?${queryParams.toString()}`, {
    signal,
  });
  return data;
}
