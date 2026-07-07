import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { QUERY_KEYS } from '../utils/constants';
import * as adminOrdersApi from '../api/adminOrders';

export const useAdminOrders = (params?: Record<string, unknown>) => {
  return useQuery({
    queryKey: [QUERY_KEYS.adminOrders, params],
    queryFn: () => adminOrdersApi.getAdminOrders(params),
  });
};

export const useAdminOrder = (id: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.adminOrder, id],
    queryFn: () => adminOrdersApi.getAdminOrder(id),
    enabled: !!id,
  });
};

export const useOrderStatusLogs = (id: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.orderStatusLogs, id],
    queryFn: () => adminOrdersApi.getOrderStatusLogs(id),
    enabled: !!id,
  });
};

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; status: string; note?: string }) =>
      adminOrdersApi.updateOrderStatus(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.adminOrders] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.adminOrder] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.inventory] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.inventoryVariant] });
      toast.success('Order status updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update order status');
    },
  });
};
