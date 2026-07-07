import apiClient from './client';
import type { Order, CreateOrderData } from '../types/order';
import type { PaginatedResponse } from '../types/api';

export const getOrders = async (filters?: { page?: number; limit?: number; status?: string }): Promise<PaginatedResponse<Order>> => {
  const { data } = await apiClient.get<PaginatedResponse<Order>>('/orders/my', { params: filters });
  return data;
};

export const getOrder = async (id: string): Promise<Order> => {
  const { data } = await apiClient.get<Order>(`/orders/my/${id}`);
  return data;
};

export const createOrder = async (orderData: CreateOrderData): Promise<Order> => {
  const { data } = await apiClient.post<Order>('/orders', orderData);
  return data;
};

export const updateOrder = async (id: string, orderData: Partial<Order>): Promise<Order> => {
  const { data } = await apiClient.patch<Order>(`/orders/${id}`, orderData);
  return data;
};

export const getMyOrders = async (filters?: { page?: number; limit?: number; status?: string }): Promise<PaginatedResponse<Order>> => {
  const { data } = await apiClient.get<PaginatedResponse<Order>>('/orders/my', { params: filters });
  return data;
};

export const getMyOrder = async (id: string): Promise<Order> => {
  const { data } = await apiClient.get<Order>(`/orders/my/${id}`);
  return data;
};

export const repurchaseOrder = async (id: string): Promise<{ itemsAdded: number; unavailableItems: number; unavailableDetails: Array<{ productName: string; reason: string }>; cart: any }> => {
  const { data } = await apiClient.post(`/orders/my/${id}/repurchase`);
  return data;
};

export const downloadOrderInvoice = async (orderId: string): Promise<Blob> => {
  const { data } = await apiClient.get<Blob>(`/orders/${orderId}/invoice`, { responseType: 'blob' });
  return data;
};

// Returns & Exchanges
export interface InitiateReturnData {
  reason: string;
  itemIds: string[];
  remarks?: string;
}

export const initiateReturn = async (orderId: string, data: InitiateReturnData): Promise<{ success: boolean; message: string }> => {
  const { data: response } = await apiClient.post(`/orders/my/${orderId}/return`, data);
  return response;
};

// Order Tracking
export interface TrackingInfo {
  courierName: string;
  awbNumber: string;
  trackingUrl?: string;
  shippedAt?: string;
  deliveredAt?: string;
  status: string;
}

export const getOrderTracking = async (orderId: string): Promise<TrackingInfo> => {
  const { data } = await apiClient.get(`/orders/my/${orderId}/tracking`);
  return data;
};

// Coupon Application
export interface ApplyCouponData {
  code: string;
  cartTotal: number;
}

export interface CouponResult {
  success: boolean;
  discountAmount: number;
  finalTotal: number;
  coupon: { code: string; description?: string };
}

export const applyCoupon = async (data: ApplyCouponData): Promise<CouponResult> => {
  const { data: response } = await apiClient.post('/orders/apply-coupon', data);
  return response;
};
