import apiClient from './client';

export interface VerifyPaymentData {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface VerifyPaymentResponse {
  verified: boolean;
  paymentId: string;
  alreadyPaid?: boolean;
}

export interface PaymentStatusResponse {
  paymentStatus: string;
  paidAmount: number;
  paymentMethod: string | null;
  invoiceGenerated: boolean;
}

/**
 * Verify Razorpay payment after successful checkout.
 * POST /api/payments/verify
 */
export const verifyPayment = async (
  data: VerifyPaymentData,
): Promise<VerifyPaymentResponse> => {
  const { data: response } = await apiClient.post<VerifyPaymentResponse>(
    '/payments/verify',
    data,
  );
  return response;
};

/**
 * Get payment status for an order (used after Razorpay redirect).
 * GET /api/payments/status/:orderId
 */
export const getPaymentStatus = async (
  orderId: string,
): Promise<PaymentStatusResponse> => {
  const { data } = await apiClient.get<PaymentStatusResponse>(
    `/payments/status/${orderId}`,
  );
  return data;
};
