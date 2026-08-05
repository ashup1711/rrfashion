import apiClient from './client';
import adminClient from './admin-client';
import type { NewsItem } from '../types/news';
import type { PaginatedResponse } from '../types/api';

export const getActiveNews = async (): Promise<NewsItem[]> => {
  const { data } = await apiClient.get<NewsItem[]>('/news');
  return data;
};

export const adminGetAllNews = async (
  page = 1,
  limit = 20,
): Promise<PaginatedResponse<NewsItem>> => {
  const { data } = await adminClient.get('/admin/news', { params: { page, limit } });
  // Backend returns { data, meta }; map to { items, meta } for frontend convention
  const resp = data as unknown as { data: NewsItem[]; meta: { page: number; limit: number; total: number; totalPages: number } };
  return { items: resp.data, meta: resp.meta };
};

export const adminCreateNews = async (formData: CreateNewsData): Promise<NewsItem> => {
  const { data } = await adminClient.post<NewsItem>('/admin/news', formData);
  return data;
};

export const adminUpdateNews = async (id: string, formData: UpdateNewsData): Promise<NewsItem> => {
  const { data } = await adminClient.patch<NewsItem>(`/admin/news/${id}`, formData);
  return data;
};

export const adminDeleteNews = async (id: string): Promise<{ message: string }> => {
  const { data } = await adminClient.delete<{ message: string }>(`/admin/news/${id}`);
  return data;
};

export interface CreateNewsData {
  title: string;
  excerpt: string;
  content?: string;
  imageUrl?: string;
  linkUrl?: string;
  linkText?: string;
  category?: string;
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
  sortOrder?: number;
}

export interface UpdateNewsData {
  title?: string;
  excerpt?: string;
  content?: string;
  imageUrl?: string;
  linkUrl?: string;
  linkText?: string;
  category?: string;
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
  sortOrder?: number;
}
