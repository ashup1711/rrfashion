import adminClient from './admin-client';

export interface AdminOrderItem {
  id: string;
  productId: string;
  variantId?: string;
  product?: {
    id: string;
    name: string;
    images?: string[];
  };
  variant?: {
    id: string;
    size?: string;
    color?: string;
    salePrice?: number;
  };
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  type: 'sale' | 'rent';
  status?: string;
}

export interface AdminOrder {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  subtotal: number;
  discountAmount: number;
  shippingCharge: number;
  taxAmount: number;
  totalAmount: number;
  channel: string;
  notes?: string;
  items: AdminOrderItem[];
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  shippingAddress?: {
    name: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
  };
  payment?: {
    id: string;
    method: string;
    status: string;
    amount: number;
  };
  createdAt: string;
  updatedAt: string;
  deliveredAt?: string;
  cancelledAt?: string;
  itemCount?: number;
}

export interface OrderStatusLog {
  id: string;
  orderId: string;
  fromStatus: string;
  toStatus: string;
  changedBy?: string;
  note?: string;
  createdAt: string;
  changedByUser?: {
    firstName: string;
    lastName: string;
  };
}

export interface AdminOrdersResponse {
  items: AdminOrder[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const getAdminOrders = async (params?: Record<string, unknown>): Promise<AdminOrdersResponse> => {
  const { data } = await adminClient.get<AdminOrdersResponse>('/admin/orders', { params });
  return data;
};

export const getAdminOrder = async (id: string): Promise<AdminOrder> => {
  const { data } = await adminClient.get<AdminOrder>(`/admin/orders/${id}`);
  return data;
};

export const getOrderStatusLogs = async (id: string): Promise<OrderStatusLog[]> => {
  const { data } = await adminClient.get<OrderStatusLog[]>(`/admin/orders/${id}/logs`);
  return data;
};

export const updateOrderStatus = async (id: string, payload: { status: string; note?: string }): Promise<AdminOrder> => {
  const { data } = await adminClient.patch<AdminOrder>(`/admin/orders/${id}/status`, payload);
  return data;
};
