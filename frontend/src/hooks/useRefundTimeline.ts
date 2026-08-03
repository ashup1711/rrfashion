import { useQuery } from '@tanstack/react-query';
import { getRefunds } from '../api/refunds';
import type { RefundsResponse } from '../api/refunds';
import { QUERY_KEYS } from '../utils/constants';

/**
 * REQ-FE-004: fetch the refund timeline for an order.
 *
 * SEC-14: user-scoped data — the query key includes the order id (which is
 * already ownership-checked server-side), and the default cache config for
 * user data applies (staleTime 0 — always refetch on focus).
 */
export const useRefundTimeline = (orderId: string) => {
  return useQuery<RefundsResponse>({
    queryKey: [QUERY_KEYS.refunds, orderId],
    queryFn: () => getRefunds(orderId),
    enabled: !!orderId,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });
};
