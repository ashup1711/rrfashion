import apiClient from './client';
import adminClient from './admin-client';
import type { Color, CreateColorData, UpdateColorData } from '../types/color';

export const getColors = async (): Promise<Color[]> => {
  const { data } = await apiClient.get<Color[]>('/colors');
  return data;
};

export const getColor = async (id: string): Promise<Color> => {
  const { data } = await apiClient.get<Color>(`/colors/${id}`);
  return data;
};

export const createColor = async (
  colorData: CreateColorData,
): Promise<Color> => {
  const { data } = await adminClient.post<Color>('/colors', colorData);
  return data;
};

export const updateColor = async (
  id: string,
  colorData: UpdateColorData,
): Promise<Color> => {
  const { data } = await adminClient.patch<Color>(`/colors/${id}`, colorData);
  return data;
};

export const deleteColor = async (id: string): Promise<{ message: string }> => {
  const { data } = await adminClient.delete<{ message: string }>(`/colors/${id}`);
  return data;
};
