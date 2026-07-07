import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getInventorySummary,
  getInventoryVariantDetail,
  createInventoryLock,
  releaseInventoryLock,
  adjustStock,
} from '../api/inventory';
import type { AdjustStockData } from '../api/inventory';
import { QUERY_KEYS } from '../utils/constants';
import type { CreateLockData } from '../types/inventory';

interface InventoryFilters {
  storeId?: string;
  variantId?: string;
  page?: number;
  limit?: number;
}

export const useInventorySummary = (filters?: InventoryFilters) => {
  return useQuery({
    queryKey: [QUERY_KEYS.inventory, filters],
    queryFn: () => getInventorySummary(filters),
    staleTime: 1000 * 30,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

export const useInventoryVariantDetail = (id: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.inventoryVariant, id],
    queryFn: () => getInventoryVariantDetail(id),
    enabled: !!id,
  });
};

export const useCreateInventoryLock = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateLockData) => createInventoryLock(data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.inventory] });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.inventoryVariant, variables.variantId],
      });
    },
  });
};

export const useReleaseInventoryLock = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => releaseInventoryLock(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.inventory] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.inventoryVariant] });
    },
  });
};

export const useAdjustStock = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AdjustStockData) => adjustStock(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.inventory] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.inventoryVariant] });
    },
  });
};
