import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getMyOrders,
  getMyOrder,
  repurchaseOrder,
  downloadOrderInvoice,
  initiateReturn,
  getOrderTracking,
  applyCoupon,
  cancelOrder,
} from '../api/orders';
import type { InitiateReturnData, ApplyCouponData, CancellationReason } from '../api/orders';
import { QUERY_KEYS } from '../utils/constants';
import { useAuthStore } from '../store/authStore';

export const useMyOrders = (filters?: { page?: number; limit?: number; status?: string }) => {
  // BUG-FIX: Only fire the orders query after auth has resolved.
  // Without this guard the query fires before initializeAuth() completes,
  // hitting the API with no session → empty result → blank orders page.
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [QUERY_KEYS.myOrders, filters],
    queryFn: () => getMyOrders(filters),
    enabled: isAuthenticated,
  });
};

export const useMyOrder = (id: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.myOrder, id],
    queryFn: () => getMyOrder(id),
    enabled: !!id,
  });
};

export const useRepurchase = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: repurchaseOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.cart] });
    },
  });
};

export const useDownloadInvoice = () => {
  return useMutation({
    mutationFn: downloadOrderInvoice,
  });
};

export const useInitiateReturn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, data }: { orderId: string; data: InitiateReturnData }) =>
      initiateReturn(orderId, data),
    onSuccess: (result, variables) => {
      // REQ-FE-003: invalidate the order + orders list so the updated
      // return/status state is reflected.
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.myOrders] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.myOrder, variables.orderId] });
      toast.success('Return request submitted successfully');
      return result;
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to initiate return');
    },
  });
};

/**
 * REQ-FE-001: cancel an order. Backend verifies the status is in
 * [PENDING, CONFIRMED] for customers (PROCESSING is admin-only) and
 * auto-refunds when the order is already PAID.
 */
export const useCancelOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason, notes }: { id: string; reason: CancellationReason; notes?: string }) =>
      cancelOrder(id, reason, notes),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.myOrders] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.myOrder, variables.id] });
      if (result.refundId) {
        toast.success('Order cancelled. Refund has been initiated.');
      } else {
        toast.success('Order cancelled successfully');
      }
      return result;
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to cancel order');
    },
  });
};

export const useOrderTracking = (orderId: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.orderTracking, orderId],
    queryFn: () => getOrderTracking(orderId),
    enabled: !!orderId,
  });
};

export const useApplyCoupon = () => {
  return useMutation({
    mutationFn: (data: ApplyCouponData) => applyCoupon(data),
  });
};
