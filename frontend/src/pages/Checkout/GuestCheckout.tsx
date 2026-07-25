import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useCart } from '../../hooks/useCart';
import { useCreateOrder } from '../../hooks/useOrders';
import { useApplyCoupon } from '../../hooks/useMyOrders';
import { verifyPayment } from '../../api/payments';
import { loadRazorpayScript } from '../../utils/loadRazorpay';
import { initializeGuestSession } from '../../utils/guestSession';
import { logger } from '../../utils/logger';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatCurrency } from '../../utils/formatCurrency';
import { ROUTES } from '../../utils/constants';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../utils/constants';
import type { CouponResult } from '../../api/orders';
import type { Order } from '../../types/order';

const GuestCheckout = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { items, total, isLoading, error } = useCart();
  const createOrder = useCreateOrder();
  const applyCouponMutation = useApplyCoupon();

  const [formData, setFormData] = useState({
    email: '',
    name: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
    paymentMethod: 'razorpay',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<CouponResult | null>(null);
  const [couponError, setCouponError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (errors[e.target.name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[e.target.name];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email address';
    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.phone) newErrors.phone = 'Phone is required';
    else if (!/^[6-9]\d{9}$/.test(formData.phone)) newErrors.phone = 'Invalid phone number';
    if (!formData.line1) newErrors.line1 = 'Address is required';
    if (!formData.city) newErrors.city = 'City is required';
    if (!formData.state) newErrors.state = 'State is required';
    if (!formData.pincode) newErrors.pincode = 'Pincode is required';
    else if (!/^\d{6}$/.test(formData.pincode)) newErrors.pincode = 'Invalid pincode';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError('Please enter a coupon code.');
      return;
    }
    setCouponError('');
    try {
      const result = await applyCouponMutation.mutateAsync({
        code: couponCode.trim(),
        cartTotal: total,
      });
      setAppliedCoupon(result);
      toast.success(`Coupon "${result.coupon.code}" applied!`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid or expired coupon code.';
      setCouponError(message);
      setAppliedCoupon(null);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (isProcessing) return;

    setIsProcessing(true);
    setPaymentError(null);

    const shippingAddress = {
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      line1: formData.line1.trim(),
      line2: formData.line2.trim() || undefined,
      city: formData.city.trim(),
      state: formData.state.trim(),
      pincode: formData.pincode.trim(),
    };

    try {
      // Step 1: Ensure guest session exists (JWT token in localStorage)
      let guestToken = localStorage.getItem('guest_token');
      if (!guestToken) {
        await initializeGuestSession();
        guestToken = localStorage.getItem('guest_token');
      }

      if (!guestToken) {
        throw new Error('Failed to initialize guest session. Please refresh and try again.');
      }

      // Step 2: Create the order via POST /orders (StoreAuthGuard + AllowGuest)
      // This works with guest JWT tokens stored in guest_token localStorage.
      // The backend creates the Razorpay order inside OrdersService.create().
      const order = await createOrder.mutateAsync({
        shippingAddress,
        paymentMethod: formData.paymentMethod,
        notes: '',
      });

      // Invalidate cart query
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.cart] });

      // If COD, we are done
      if (formData.paymentMethod === 'cod') {
        toast.success('Order placed successfully!');
        navigate(ROUTES.ORDER_DETAIL(order.id));
        return;
      }

      // Step 3: Log order creation for debugging
      logger.debug('Guest order created:', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        razorpayOrderId: order.razorpayOrderId,
        razorpayKeyId: order.razorpayKeyId ? `${order.razorpayKeyId.substring(0, 8)}...` : 'MISSING',
        amount: order.amount,
        razorpayError: order.razorpayError,
      });

      // Step 4: Check if Razorpay order creation failed server-side
      if (!order.razorpayOrderId) {
        const errorMsg = order.razorpayError || 'Failed to initialize payment gateway. Please try Cash on Delivery or contact support.';
        logger.error('Razorpay initialization failed:', order.razorpayError || 'Missing razorpayOrderId');
        setPaymentError(errorMsg);
        setCreatedOrder(order);
        setIsProcessing(false);
        return;
      }

      // Step 5: Validate Razorpay key
      if (!order.razorpayKeyId) {
        console.error('[GuestCheckout] Razorpay key ID is missing from backend response');
        setPaymentError('Payment gateway is not configured properly. Please contact support or choose Cash on Delivery.');
        setCreatedOrder(order);
        setIsProcessing(false);
        return;
      }

      // Step 6: Load Razorpay checkout script
      try {
        logger.debug('Loading Razorpay checkout script...');
        await loadRazorpayScript();
        logger.debug('Razorpay script loaded successfully');
      } catch (scriptError) {
        console.error('[GuestCheckout] Failed to load Razorpay script:', scriptError);
        setPaymentError('Payment gateway failed to load. Your order is saved — you can try again.');
        setCreatedOrder(order);
        setIsProcessing(false);
        return;
      }

      // Step 7: Verify Razorpay is available
      const Razorpay = (window as any).Razorpay;
      if (!Razorpay) {
        console.error('[GuestCheckout] Razorpay global object not found after script load');
        setPaymentError('Payment gateway failed to initialize. Please try again or contact support.');
        setCreatedOrder(order);
        setIsProcessing(false);
        return;
      }

      // Step 8: Open Razorpay checkout modal
      const razorpayOptions = {
        key: order.razorpayKeyId,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'RR FASHION',
        description: `Order ${order.orderNumber}`,
        order_id: order.razorpayOrderId,
        handler: async (paymentResponse: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          logger.debug('Payment response received:', {
            razorpay_order_id: paymentResponse.razorpay_order_id,
            razorpay_payment_id: paymentResponse.razorpay_payment_id,
          });

          try {
            logger.debug('Verifying payment with backend...');
            const verifyResult = await verifyPayment({
              razorpayOrderId: paymentResponse.razorpay_order_id,
              razorpayPaymentId: paymentResponse.razorpay_payment_id,
              razorpaySignature: paymentResponse.razorpay_signature,
            });

            logger.debug('Verification result:', verifyResult);

            if (verifyResult.verified) {
              logger.debug('Payment verified successfully');
              toast.success('Payment successful! Your order is confirmed.');
              navigate(ROUTES.ORDER_DETAIL(order.id));
            } else {
              console.error('[GuestCheckout] Payment verification failed');
              toast.error('Payment verification failed. Please contact support with your order number.');
              navigate(ROUTES.ORDER_DETAIL(order.id));
            }
          } catch (verifyError) {
            console.error('[GuestCheckout] Payment verification failed:', verifyError);
            toast.error('Payment verification failed. Your order is saved — please contact support.');
            navigate(ROUTES.ORDER_DETAIL(order.id));
          }
        },
        prefill: {
          name: shippingAddress.name,
          email: formData.email,
          contact: shippingAddress.phone,
        },
        theme: { color: '#2A2522' },
        // Redirect URL for Razorpay return (e.g. mobile apps, 3D Secure).
        // Hash routing requires /#/ prefix.
        redirect: {
          return_url: `${window.location.origin}/#/orders/${order.id}?payment=verifying`,
        },
        modal: {
          ondismiss: () => {
            // Don't assume payment failed — navigate to order detail which
            // will check the actual payment status via the backend endpoint.
            logger.debug('Payment modal dismissed by user');
            navigate(ROUTES.ORDER_DETAIL(order.id) + '?payment=checking');
          },
        },
      };

      try {
        logger.debug('Opening Razorpay modal...');
        const razorpay = new Razorpay(razorpayOptions);
        razorpay.open();
        logger.debug('Razorpay modal opened successfully');
      } catch (initError) {
        console.error('[GuestCheckout] Razorpay initialization failed:', initError);
        setPaymentError('Failed to open payment gateway. Please try Cash on Delivery or contact support.');
        setCreatedOrder(order);
        setIsProcessing(false);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to place order. Please try again.';
      toast.error(message);
      setIsProcessing(false);
    }
  };

  // Payment Error Recovery UI
  const renderPaymentError = () => {
    if (!paymentError || !createdOrder) return null;
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h3 className="text-sm font-bold text-red-800 uppercase tracking-widest mb-2">Payment Failed</h3>
            <p className="text-sm text-red-700 leading-relaxed mb-4">{paymentError}</p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => {
                  setPaymentError(null);
                  setCreatedOrder(null);
                  handleSubmit({ preventDefault: () => {} } as React.FormEvent);
                }}
                className="px-6 py-2.5 bg-red-600 text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-red-700 transition-all"
              >
                Try Again
              </button>
              <button
                onClick={() => navigate(ROUTES.ORDER_DETAIL(createdOrder.id))}
                className="px-6 py-2.5 bg-white text-red-800 text-xs font-bold uppercase tracking-widest rounded-xl border border-red-200 hover:bg-red-50 transition-all"
              >
                View Order
              </button>
              <Link
                to={ROUTES.ORDERS}
                className="px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-red-600 hover:text-red-800 transition-colors self-center"
              >
                Choose Cash on Delivery →
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // --- Render states ---

  if (isLoading) {
    return (
      <div className="container-page py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Guest Checkout</h1>
        <Card>
          <LoadingSpinner size="lg" label="Loading cart..." />
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-page py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Guest Checkout</h1>
        <Card>
          <div className="text-center py-8">
            <p className="text-red-500 mb-4">Failed to load cart. Please refresh.</p>
            <Button onClick={() => window.location.reload()}>Refresh Page</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="container-page py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Guest Checkout</h1>
        <Card>
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">Your cart is empty.</p>
            <Link to={ROUTES.SHOP}>
              <Button>Start Shopping</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const finalTotal = appliedCoupon ? appliedCoupon.finalTotal : total;
  const discountAmount = appliedCoupon ? appliedCoupon.discountAmount : 0;

  return (
    <div className="container-page py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Guest Checkout</h1>
      <p className="text-sm text-gray-500 mb-8">
        You&apos;re checking out as a guest. <Link to={ROUTES.LOGIN} className="text-primary-600 hover:text-primary-700">Sign in</Link> to your account for faster checkout.
      </p>

      {renderPaymentError()}

      <div className="lg:grid lg:grid-cols-3 lg:gap-12">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit}>
            <Card className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
              <Input
                label="Email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                error={errors.email}
                required
                placeholder="guest@example.com"
              />
            </Card>

            <Card className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Shipping Address</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Full Name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    error={errors.name}
                    required
                  />
                  <Input
                    label="Phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    error={errors.phone}
                    required
                    placeholder="9876543210"
                  />
                </div>
                <Input
                  label="Address Line 1"
                  name="line1"
                  value={formData.line1}
                  onChange={handleChange}
                  error={errors.line1}
                  required
                  placeholder="123 Main St"
                />
                <Input
                  label="Address Line 2 (Optional)"
                  name="line2"
                  value={formData.line2}
                  onChange={handleChange}
                  placeholder="Apartment, floor, etc."
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label="City"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    error={errors.city}
                    required
                  />
                  <Input
                    label="State"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    error={errors.state}
                    required
                  />
                  <Input
                    label="Pincode"
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleChange}
                    error={errors.pincode}
                    required
                    placeholder="400001"
                  />
                </div>
              </div>
            </Card>

            <Card className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h3>
              <Select
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleChange}
                options={[
                  { value: 'razorpay', label: 'Razorpay (Card / UPI / Net Banking)' },
                  { value: 'cod', label: 'Cash on Delivery' },
                ]}
              />
            </Card>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={isProcessing || createOrder.isPending}
              disabled={isProcessing || createOrder.isPending || !items.length}
            >
              Place Order
            </Button>
          </form>
        </div>

        <div className="mt-8 lg:mt-0">
          <Card className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.variantId ?? item.productId} className="flex justify-between text-sm">
                  <span className="text-gray-600 truncate flex-1">
                    {item.name} &times; {item.quantity}
                  </span>
                  <span className="text-gray-900 ml-2">
                    {formatCurrency((item.salePrice ?? item.basePrice) * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between text-sm pt-3 mt-3 border-t border-gray-200">
                <span className="text-gray-600">
                  Discount ({appliedCoupon?.coupon?.code})
                  {appliedCoupon?.coupon?.description && (
                    <span className="block text-xs text-gray-400">{appliedCoupon.coupon.description}</span>
                  )}
                </span>
                <span className="text-green-600">-{formatCurrency(discountAmount)}</span>
              </div>
            )}

            <div className="border-t border-gray-200 pt-3 mt-3 flex justify-between">
              <span className="text-base font-semibold text-gray-900">Total</span>
              <span className="text-base font-semibold text-gray-900">{formatCurrency(finalTotal)}</span>
            </div>
          </Card>

          {/* Coupon Section */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Coupon Code</h3>
            {appliedCoupon ? (
              <div>
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-md">
                  <div>
                    <p className="text-sm font-medium text-green-800">{appliedCoupon.coupon.code}</p>
                    {appliedCoupon.coupon.description && (
                      <p className="text-xs text-green-600">{appliedCoupon.coupon.description}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="text-sm text-red-600 hover:text-red-700 font-medium"
                    aria-label="Remove coupon"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value);
                      setCouponError('');
                    }}
                    placeholder="Enter coupon code"
                    className="block flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    aria-label="Coupon code"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleApplyCoupon}
                    isLoading={applyCouponMutation.isPending}
                  >
                    Apply
                  </Button>
                </div>
                {couponError && (
                  <p className="mt-1 text-sm text-red-600" role="alert">
                    {couponError}
                  </p>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default GuestCheckout;
