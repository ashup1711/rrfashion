import apiClient from './client';
import adminClient from './admin-client';
import type { Brand, CreateBrandData, UpdateBrandData } from '../types/brand';

export const getBrands = async (): Promise<Brand[]> => {
  const { data } = await apiClient.get<Brand[]>('/brands');
  return data;
};

export const getBrand = async (id: string): Promise<Brand> => {
  const { data } = await apiClient.get<Brand>(`/brands/${id}`);
  return data;
};

export const createBrand = async (
  brandData: CreateBrandData,
): Promise<Brand> => {
  const { data } = await adminClient.post<Brand>('/brands', brandData);
  return data;
};

export const updateBrand = async (
  id: string,
  brandData: UpdateBrandData,
): Promise<Brand> => {
  const { data } = await adminClient.patch<Brand>(`/brands/${id}`, brandData);
  return data;
};

export const deleteBrand = async (id: string): Promise<{ message: string }> => {
  const { data } = await adminClient.delete<{ message: string }>(`/brands/${id}`);
  return data;
};
