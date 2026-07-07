import apiClient from './client';
import adminClient from './admin-client';
import type {
  InventoryVariantDetail,
  CreateLockData,
  InventorySummary,
} from '../types/inventory';
import type { PaginatedResponse } from '../types/api';

interface InventoryQuery {
  storeId?: string;
  variantId?: string;
  variantIds?: string;
  page?: number;
  limit?: number;
}

export interface InventoryListItem {
  variantId: string;
  storeId: string;
  quantityAvailable: number;
  quantityReserved: number;
  quantityLocked: number;
  quantitySold: number;
  variant: {
    sku: string;
    size: string;
    color: string;
    product: { name: string };
  };
  store: {
    name: string;
  };
}

export const getInventorySummary = async (
  params?: InventoryQuery,
): Promise<PaginatedResponse<InventoryListItem>> => {
  const { data } = await adminClient.get<PaginatedResponse<InventoryListItem>>(
    '/admin/inventory',
    { params },
  );
  return data;
};

export const getInventoryVariantDetail = async (
  id: string,
): Promise<InventoryVariantDetail> => {
  const { data } = await adminClient.get<InventoryVariantDetail>(
    `/admin/inventory/variants/${id}`,
  );
  return data;
};

export const createInventoryLock = async (
  lockData: CreateLockData,
): Promise<{ id: string; expiresAt: string }> => {
  const { data } = await adminClient.post<{ id: string; expiresAt: string }>(
    '/admin/inventory/locks',
    lockData,
  );
  return data;
};

export const releaseInventoryLock = async (
  id: string,
): Promise<{ message: string }> => {
  const { data } = await adminClient.delete<{ message: string }>(
    `/admin/inventory/locks/${id}`,
  );
  return data;
};

export interface AdjustStockData {
  variantId: string;
  storeId: string;
  quantityChange: number;
  type: 'PURCHASE' | 'SALE' | 'RETURN' | 'ADJUSTMENT' | 'MANUAL';
  notes?: string;
}

export const adjustStock = async (
  data: AdjustStockData,
): Promise<InventorySummary> => {
  const { data: response } = await adminClient.patch<InventorySummary>(
    '/admin/inventory/adjust-stock',
    data,
  );
  return response;
};
