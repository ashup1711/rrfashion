import apiClient from './client';
import adminClient from './admin-client';
import type { Size, CreateSizeData, UpdateSizeData } from '../types/size';

export const getSizes = async (): Promise<Size[]> => {
  const { data } = await apiClient.get<Size[]>('/sizes');
  return data;
};

export const getSize = async (id: string): Promise<Size> => {
  const { data } = await apiClient.get<Size>(`/sizes/${id}`);
  return data;
};

export const createSize = async (sizeData: CreateSizeData): Promise<Size> => {
  const { data } = await adminClient.post<Size>('/sizes', sizeData);
  return data;
};

export const updateSize = async (
  id: string,
  sizeData: UpdateSizeData,
): Promise<Size> => {
  const { data } = await adminClient.patch<Size>(`/sizes/${id}`, sizeData);
  return data;
};

export const deleteSize = async (id: string): Promise<{ message: string }> => {
  const { data } = await adminClient.delete<{ message: string }>(`/sizes/${id}`);
  return data;
};
