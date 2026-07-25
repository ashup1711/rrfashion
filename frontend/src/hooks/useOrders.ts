import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getOrders,
  getOrder,
  createOrder,
  updateOrder,
} from '../api/orders';
import { QUERY_KEYS } from '../utils/constants';
import type { CreateOrderData } from '../types/order';

/**
 * Admin/all orders — GET /orders (with filters).
 */
export const useOrders = (filters?: { page?: number; limit?: number; status?: string }) => {
  return useQuery({
    queryKey: [QUERY_KEYS.orders, filters],
    queryFn: () => getOrders(filters),
  });
};

/**
 * Single admin order — GET /orders/:id.
 */
export const useOrder = (id: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.order, id],
    queryFn: () => getOrder(id),
    enabled: !!id,
  });
};

/**
 * Create order mutation — POST /orders.
 * Invalidates orders, inventory, and cart caches on success.
 */
export const useCreateOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderData: CreateOrderData) => createOrder(orderData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.orders] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.inventory] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.inventoryVariant] });
      // Invalidate cart — backend clears cart items inside the order creation transaction,
      // so the next cart fetch will return an empty cart. Without this, callers must
      // manually invalidate, which is easy to forget.
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.cart] });
    },
  });
};

/**
 * Update order mutation — PATCH /orders/:id.
 */
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
