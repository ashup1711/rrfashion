import apiClient from './client';

/**
 * REQ-BE-008: customer-facing refund list.
 *
 * `status` values match the Prisma `RefundStatus` enum:
 * INITIATED → PROCESSED | FAILED.
 */
export type RefundStatus = 'INITIATED' | 'PROCESSED' | 'FAILED';

export interface Refund {
  id: string;
  orderId: string;
  returnRequestId?: string | null;
  amount: number;
  status: RefundStatus;
  reason?: string | null;
  initiatedAt: string;
  processedAt?: string | null;
  /** Null while the refund is INITIATED or when the internal id is masked */
  razorpayRefundId?: string | null;
}

export interface RefundsResponse {
  refunds: Refund[];
}

/**
 * REQ-FE-004: list all refunds for an order, oldest first (backend sorts by
 * initiatedAt asc so the timeline renders INITIATED → PROCESSED / FAILED).
 */
export const getRefunds = async (orderId: string): Promise<RefundsResponse> => {
  const { data } = await apiClient.get<RefundsResponse>(`/orders/${orderId}/refunds`);
  return data;
};
