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
/**
 * REQ-BE-006: per-item return request payload.
 *
 * The body is an array of items, each with its own quantity, reason,
 * photos (already-uploaded asset keys), and notes. The owning order is
 * in the URL path; ownership is verified server-side.
 */
export interface ReturnItemInput {
  /** OrderItem.id (UUID) being returned */
  orderItemId: string;
  /** How many units of this line are being returned (>= 1, <= purchased qty) */
  quantity: number;
  /** Structured reason code — must match the Prisma `ReturnReason` enum */
  reason: string;
  /** Already-uploaded photo asset keys (optional) */
  photos?: string[];
  /** Free-text notes from the customer (max 2000 chars) */
  notes?: string;
}

export interface InitiateReturnData {
  items: ReturnItemInput[];
}

export interface ReturnRequestItem {
  id: string;
  orderItemId: string;
  quantity: number;
  reason: string;
  photos: string[];
  notes?: string | null;
  status: string;
  refundAmount?: number | null;
}

export interface ReturnRequest {
  id: string;
  orderId: string;
  status: string;
  createdAt: string;
  resolvedAt?: string | null;
  adminNotes?: string | null;
}

/**
 * REQ-FE-003: initiate a per-item return request.
 * @deprecated Prefer `createReturn` from `./returns` — kept as a thin
 * delegation so existing consumers of `initiateReturn` keep working.
 */
export const initiateReturn = async (orderId: string, data: InitiateReturnData): Promise<{ returnRequest: ReturnRequest; items: ReturnRequestItem[] }> => {
  const { data: response } = await apiClient.post(`/orders/${orderId}/return`, data);
  return response;
};

// Order Cancellation
/**
 * CancellationReason values match the Prisma enum (schema.prisma).
 * Customer-facing flows only offer CUSTOMER_REQUEST / OTHER; admin
 * override uses ADMIN_OVERRIDE via the admin endpoint.
 */
export type CancellationReason =
  | 'CUSTOMER_REQUEST'
  | 'OUT_OF_STOCK'
  | 'FRAUD'
  | 'ADMIN_OVERRIDE'
  | 'OTHER';

export interface CancelOrderResult {
  id: string;
  status: 'CANCELLED';
  refundId?: string | null;
  cancelledAt: string;
}

/**
 * REQ-FE-001: cancel an order. Backend verifies the status is in
 * [PENDING, CONFIRMED] for customers (PROCESSING is admin-only).
 * When the order is already PAID, the backend auto-refunds and returns
 * `refundId`.
 */
export const cancelOrder = async (id: string, reason: CancellationReason, notes?: string): Promise<CancelOrderResult> => {
  const { data } = await apiClient.post<CancelOrderResult>(`/orders/${id}/cancel`, { reason, notes });
  return data;
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
