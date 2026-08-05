import apiClient from './client';
import adminClient from './admin-client';
import type { BlogPost, BlogListResponse } from '../types/blog';
import type { PaginatedResponse } from '../types/api';

export const getBlogs = async (params?: { page?: number; limit?: number; category?: string }): Promise<BlogListResponse> => {
  const { data } = await apiClient.get<{ data: BlogPost[]; meta: { page: number; limit: number; total: number; totalPages: number } }>('/blogs', { params });
  return { items: data.data, meta: data.meta };
};

export const getBlogBySlug = async (slug: string): Promise<BlogPost> => {
  const { data } = await apiClient.get<BlogPost>(`/blogs/${slug}`);
  return data;
};

export const adminGetAllBlogs = async (
  page = 1,
  limit = 20,
): Promise<PaginatedResponse<BlogPost>> => {
  const { data } = await adminClient.get('/admin/blogs', { params: { page, limit } });
  return data;
};

export const adminCreateBlog = async (formData: CreateBlogData): Promise<BlogPost> => {
  const { data } = await adminClient.post<BlogPost>('/admin/blogs', formData);
  return data;
};

export const adminUpdateBlog = async (id: string, formData: UpdateBlogData): Promise<BlogPost> => {
  const { data } = await adminClient.patch<BlogPost>(`/admin/blogs/${id}`, formData);
  return data;
};

export const adminDeleteBlog = async (id: string): Promise<{ message: string }> => {
  const { data } = await adminClient.delete<{ message: string }>(`/admin/blogs/${id}`);
  return data;
};

export interface CreateBlogData {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  imageUrl?: string;
  category?: string;
  tags?: string[];
  author?: string;
  isPublished?: boolean;
  publishedAt?: string;
}

export interface UpdateBlogData {
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  imageUrl?: string;
  category?: string;
  tags?: string[];
  author?: string;
  isPublished?: boolean;
  publishedAt?: string;
}
