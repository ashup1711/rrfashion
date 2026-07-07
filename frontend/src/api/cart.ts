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

export const addCartItem = async (variantId: string, quantity: number, type?: string): Promise<Cart> => {
  const { data } = await apiClient.post<Cart>('/cart/add', { variantId, quantity, type: type || 'sale' });
  return data;
};

export const updateCartItem = async (itemId: string, quantity: number): Promise<Cart> => {
  const { data } = await apiClient.patch<Cart>(`/cart/items/${itemId}`, { quantity });
  return data;
};

export const removeFromCart = async (itemId: string): Promise<void> => {
  await apiClient.delete(`/cart/items/${itemId}`);
};
