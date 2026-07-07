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
} from '../api/orders';
import type { InitiateReturnData, ApplyCouponData } from '../api/orders';
import { QUERY_KEYS } from '../utils/constants';

export const useMyOrders = (filters?: { page?: number; limit?: number; status?: string }) => {
  return useQuery({
    queryKey: [QUERY_KEYS.myOrders, filters],
    queryFn: () => getMyOrders(filters),
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.myOrders] });
      toast.success('Return initiated successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to initiate return');
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
