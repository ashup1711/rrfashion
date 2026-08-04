import apiClient from './client';
import type { Product } from '../types/product';
import type { ProductVariant } from '../types/product';

export interface CartItem {
  id: string;
  variantId?: string;
  productId: string;
  product?: Product;
  variant?: ProductVariant;
  quantity: number;
  type?: string;
  unitPrice?: number;
}

export interface Cart {
  id?: string;
  items: CartItem[];
  itemCount?: number;
  total: number;
}

export const getCart = async (): Promise<Cart> => {
  const { data } = await apiClient.get<Cart>('/cart');
  return data;
};

/**
 * @deprecated Use `addCartItem(variantId, quantity, type)` instead.
 * Kept for backward compatibility — resolves productId to the first variant.
 */
export const addToCart = async (productId: string, quantity: number, type?: string): Promise<Cart> => {
  const { data } = await apiClient.post<Cart>('/cart/add', { variantId: productId, quantity, type: type || 'sale' });
  return data;
};

export const addCartItem = async (
  variantId: string,
  quantity: number,
  type?: string,
  _cartId?: string | null,
  rent?: { rentStart?: string; rentEnd?: string },
): Promise<Cart> => {
  const { data } = await apiClient.post<Cart>('/cart/items', {
    variantId,
    quantity,
    type: type || 'sale',
    // Don't send cartId — backend resolves cart from the auth token
    ...(rent?.rentStart ? { rentStart: rent.rentStart } : {}),
    ...(rent?.rentEnd ? { rentEnd: rent.rentEnd } : {}),
  });
  return data;
};

/**
 * REQ-BE-005 / REQ-FE-002: recover an abandoned cart from a signed 7-day
 * recovery link. Public endpoint — works for authenticated customers (cookie
 * auth via withCredentials) and guests (guest Bearer via the apiClient
 * request interceptor). Response: `{ cart, items, recoveredAt }`.
 */
export interface RecoverCartResponse {
  cart: Cart;
  items: CartItem[];
  recoveredAt: string;
}

export const recover = async (token: string): Promise<RecoverCartResponse> => {
  const { data } = await apiClient.get<RecoverCartResponse>(`/cart/recover/${token}`);
  return data;
};

export const updateCartItem = async (itemId: string, quantity: number): Promise<Cart> => {
  const { data } = await apiClient.patch<Cart>(`/cart/items/${itemId}`, { quantity });
  return data;
};

export const removeFromCart = async (itemId: string): Promise<void> => {
  await apiClient.delete(`/cart/items/${itemId}`);
};

/**
 * REQ-FE-GUEST-001: guest identity travels in the `Authorization: Bearer
 * <guest_token>` header (attached by the client.ts request interceptor), so
 * merge takes no body and no guestSessionId. The backend resolves the guest
 * session from the verified JWT and the customer identity from the cookie.
 */
export const mergeCart = async (): Promise<{ merged: boolean; items: CartItem[] }> => {
  const { data } = await apiClient.post<{ merged: boolean; items: CartItem[] }>('/cart/merge');
  return data;
};
