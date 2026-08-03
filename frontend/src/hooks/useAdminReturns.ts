import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getAdminReturns,
  approveReturn,
  rejectReturn,
} from '../api/returns';
import type { AdminReturnsParams, ApproveReturnPayload } from '../api/returns';
import { QUERY_KEYS } from '../utils/constants';

/**
 * REQ-FE-003: admin return-queue query + approve/reject mutations.
 */

export const useAdminReturns = (params: AdminReturnsParams) => {
  return useQuery({
    queryKey: [QUERY_KEYS.adminReturns, params],
    queryFn: () => getAdminReturns(params),
    staleTime: 1000 * 30,
  });
};

export const useApproveReturn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload?: ApproveReturnPayload }) =>
      approveReturn(id, payload),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.adminReturns] });
      const refundCount = result.refunds?.length ?? 0;
      toast.success(
        refundCount > 0
          ? `Return approved — ${refundCount} refund${refundCount === 1 ? '' : 's'} initiated`
          : 'Return approved',
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to approve return');
    },
  });
};

export const useRejectReturn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, adminNotes }: { id: string; adminNotes: string }) =>
      rejectReturn(id, adminNotes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.adminReturns] });
      toast.success('Return rejected');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reject return');
    },
  });
};
