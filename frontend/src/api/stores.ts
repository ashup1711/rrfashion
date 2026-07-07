import apiClient from './client';
import adminClient from './admin-client';
import type {
  StoreLocation,
  CreateStoreData,
  UpdateStoreData,
} from '../types/store';

export const getStores = async (): Promise<StoreLocation[]> => {
  const { data } = await adminClient.get<StoreLocation[]>('/admin/stores');
  return data;
};

export const getStore = async (id: string): Promise<StoreLocation> => {
  const { data } = await adminClient.get<StoreLocation>(`/admin/stores/${id}`);
  return data;
};

export const createStore = async (
  storeData: CreateStoreData,
): Promise<StoreLocation> => {
  const { data } = await adminClient.post<StoreLocation>(
    '/admin/stores',
    storeData,
  );
  return data;
};

export const updateStore = async (
  id: string,
  storeData: UpdateStoreData,
): Promise<StoreLocation> => {
  const { data } = await adminClient.patch<StoreLocation>(
    `/admin/stores/${id}`,
    storeData,
  );
  return data;
};
