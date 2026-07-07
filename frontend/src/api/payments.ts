import apiClient from './client';

export interface VerifyPaymentData {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface VerifyPaymentResponse {
  verified: boolean;
  paymentId: string;
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
