import type { Product } from './product';
import type { ProductVariant } from './product';

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PACKED' | 'SHIPPED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED' | 'PARTIALLY_CANCELLED' | 'RETURNED';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  product?: Product;
  variantId?: string;
  variant?: ProductVariant;
  unitId?: string;
  type: 'sale' | 'rent';
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  hsnCode?: string;
  taxRate?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  depositAmount?: number;
  rentStart?: string;
  rentEnd?: string;
  rentDays?: number;
  status?: string;
}

export interface Order {
  id: string;
  userId?: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus?: PaymentStatus;
  subtotal: number;
  discountAmount: number;
  shippingCharge: number;
  taxAmount: number;
  totalAmount: number;
  storeId?: string;
  channel: 'online' | 'offline';
  couponId?: string;
  notes?: string;
  itemCount?: number;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string;
  deliveredAt?: string;
  /** Razorpay order ID — null if Razorpay order creation failed server-side */
  razorpayOrderId?: string | null;
  /** Razorpay key ID for client-side checkout */
  razorpayKeyId?: string;
  /** Amount in paise (for Razorpay) */
  amount?: number;
  /** Currency code (e.g. INR) */
  currency?: string;
  /** Payment gateway error message if Razorpay initialization failed */
  razorpayError?: string | null;
  /** Shipping address snapshot at time of order */
  shippingAddress?: ShippingAddress;
  /** Payment method used */
  paymentMethod?: string;
}

export interface ShippingAddress {
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
}

export interface CreateOrderData {
  /** Shipping address for delivery */
  shippingAddress: {
    name: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
  };
  /** Payment method: 'razorpay' | 'cod' */
  paymentMethod: string;
  /** Optional notes for the order */
  notes?: string;
}
