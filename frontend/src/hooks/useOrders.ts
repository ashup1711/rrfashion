import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getOrders,
  getOrder,
  createOrder,
  updateOrder,
  getMyOrders,
  getMyOrder,
  repurchaseOrder,
  downloadOrderInvoice,
} from '../api/orders';
import { QUERY_KEYS } from '../utils/constants';
import type { CreateOrderData } from '../types/order';

export const useOrders = (filters?: { page?: number; limit?: number; status?: string }) => {
  return useQuery({
    queryKey: [QUERY_KEYS.orders, filters],
    queryFn: () => getOrders(filters),
  });
};

export const useOrder = (id: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.order, id],
    queryFn: () => getOrder(id),
    enabled: !!id,
  });
};

/**
 * Alias for useOrders — fetches current user's orders from GET /orders/my.
 */
export const useMyOrders = (filters?: { page?: number; limit?: number; status?: string }) => {
  return useQuery({
    queryKey: [QUERY_KEYS.myOrders, filters],
    queryFn: () => getMyOrders(filters),
  });
};

/**
 * Fetches a single order by ID from GET /orders/my/:id.
 */
export const useMyOrder = (id: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.myOrder, id],
    queryFn: () => getMyOrder(id),
    enabled: !!id,
  });
};

/**
 * Repurchase mutation — POST /orders/my/:id/repurchase.
 */
export const useRepurchase = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: repurchaseOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.cart] });
    },
  });
};

/**
 * Download invoice mutation — returns a Blob.
 */
export const useDownloadInvoice = () => {
  return useMutation({
    mutationFn: downloadOrderInvoice,
  });
};

export const useCreateOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderData: CreateOrderData) => createOrder(orderData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.orders] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.inventory] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.inventoryVariant] });
    },
  });
};

export const useUpdateOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateOrder>[1] }) =>
      updateOrder(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.orders] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.inventory] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.inventoryVariant] });
    },
  });
};
