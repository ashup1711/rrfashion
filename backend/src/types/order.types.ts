/**
 * TypeScript interfaces for order-related responses
 * These types ensure type safety and document API response shapes
 */

/**
 * Order item in the response
 */
export interface OrderItemResponse {
  id: string;
  product: {
    id: string;
    name: string;
    slug?: string;
    images?: string[];
  };
  variant: {
    id: string;
    size?: string;
    color?: string;
  } | null;
  quantity: number;
  unitPrice: number;
}

/**
 * Shipping address structure
 */
export interface ShippingAddressResponse {
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
}

/**
 * Response shape for POST /orders endpoint
 * Includes Razorpay payment initialization details
 */
export interface CreateOrderResponse {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  items: OrderItemResponse[];
  shippingAddress: ShippingAddressResponse;
  paymentMethod: string;
  notes: string | null;
  createdAt: Date;
  razorpayOrderId: string | null;
  razorpayKeyId: string;
  amount: number;
  currency: string;
  /**
   * Payment gateway error message if Razorpay order creation failed
   * When present, frontend should show this error to the user
   * and suggest fallback payment method (e.g., Cash on Delivery)
   */
  razorpayError?: string | null;
}
