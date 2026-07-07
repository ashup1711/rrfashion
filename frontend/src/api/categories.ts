import apiClient from './client';
import adminClient from './admin-client';
import type { Category, CreateCategoryData } from '../types/category';

export const getCategories = async (): Promise<Category[]> => {
  const { data } = await apiClient.get<Category[]>('/categories');
  return data;
};

export const getCategoryTree = async (): Promise<Category[]> => {
  const { data } = await apiClient.get<Category[]>('/categories', {
    params: { tree: true },
  });
  return data;
};

export const getCategory = async (id: string): Promise<Category> => {
  const { data } = await apiClient.get<Category>(`/categories/${id}`);
  return data;
};

export const createCategory = async (
  categoryData: CreateCategoryData,
): Promise<Category> => {
  const { data } = await adminClient.post<Category>('/categories', categoryData);
  return data;
};

export const updateCategory = async (
  id: string,
  categoryData: Partial<CreateCategoryData>,
): Promise<Category> => {
  const { data } = await adminClient.patch<Category>(
    `/categories/${id}`,
    categoryData,
  );
  return data;
};

export const deleteCategory = async (id: string): Promise<{ message: string }> => {
  const { data } = await adminClient.delete<{ message: string }>(
    `/categories/${id}`,
  );
  return data;
};
