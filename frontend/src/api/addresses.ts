import apiClient from './client';
import type { UserAddress, CreateAddressData } from '../types/address';

export const getAddresses = async (): Promise<UserAddress[]> => {
  const { data } = await apiClient.get<UserAddress[]>('/addresses');
  return data;
};

export const createAddress = async (dto: CreateAddressData): Promise<UserAddress> => {
  const { data } = await apiClient.post<UserAddress>('/addresses', dto);
  return data;
};

export const updateAddress = async (id: string, dto: Partial<CreateAddressData>): Promise<UserAddress> => {
  const { data } = await apiClient.patch<UserAddress>(`/addresses/${id}`, dto);
  return data;
};

export const deleteAddress = async (id: string): Promise<void> => {
  await apiClient.delete(`/addresses/${id}`);
};

export const setDefaultAddress = async (id: string): Promise<UserAddress> => {
  const { data } = await apiClient.patch<UserAddress>(`/addresses/${id}/default`);
  return data;
};
