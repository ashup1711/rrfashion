import apiClient from './client';

export interface GuestAuthResponse {
  guestId: string;
  guestToken: string;
}

export interface GuestCheckoutData {
  guestId: string;
  email: string;
  items: Array<{ variantId: string; quantity: number }>;
  shippingAddress: {
    name: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
  };
  paymentMethod: string;
}

/**
 * @deprecated Legacy guest creation. Guest sessions are now created via
 * `POST /guest/start` which returns a JWT token used with Bearer auth.
 * Kept temporarily for backward compatibility.
 */
export const createGuestUser = async (): Promise<GuestAuthResponse> => {
  const { data } = await apiClient.post<GuestAuthResponse>('/auth/guest');
  return data;
};

export const guestCheckout = async (checkoutData: GuestCheckoutData): Promise<any> => {
  const { data } = await apiClient.post('/orders/guest', checkoutData);
  return data;
};
