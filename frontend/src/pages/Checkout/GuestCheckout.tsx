import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useGuestCheckout, useGuestAuth } from '../../hooks/useGuestAuth';
import { useApplyCoupon } from '../../hooks/useMyOrders';
import { useCartStore } from '../../store/cartStore';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import Card from '../../components/ui/Card';
import { formatCurrency } from '../../utils/formatCurrency';
import { ROUTES } from '../../utils/constants';
import type { CouponResult } from '../../api/orders';
import { getOrCreateGuestSessionId } from '../../utils/guestSession';

const GuestCheckout = () => {
  const navigate = useNavigate();
  const { items, total } = useCartStore();
  const guestAuthMutation = useGuestAuth();
  const guestCheckoutMutation = useGuestCheckout();
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

    try {
      // Ensure we have a guest user (legacy: also create the old-style session
      // so the POST /orders/guest endpoint can authenticate).
      let guestToken = localStorage.getItem('guest_token');

      if (!guestToken) {
        const result = await guestAuthMutation.mutateAsync();
        guestToken = result.guestToken;
      }

      const guestSessionId = getOrCreateGuestSessionId();

      const checkoutData = {
        guestId: guestSessionId,
        email: formData.email,
        items: items.map((item) => ({
          variantId: item.variantId || item.productId,
          quantity: item.quantity,
        })),
        shippingAddress: {
          name: formData.name,
          phone: formData.phone,
          line1: formData.line1,
          line2: formData.line2 || undefined,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
        },
        paymentMethod: formData.paymentMethod,
        ...(appliedCoupon?.coupon?.code ? { couponCode: appliedCoupon.coupon.code } : {}),
      };

      await guestCheckoutMutation.mutateAsync(checkoutData);
      navigate(ROUTES.ORDERS, { state: { guestOrderPlaced: true } });
    } catch (err) {
      toast.error('Checkout failed. Please verify your details and try again.');
    }
  };

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
        You're checking out as a guest. <Link to={ROUTES.LOGIN} className="text-primary-600 hover:text-primary-700">Sign in</Link> to your account for faster checkout.
      </p>

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
              isLoading={guestCheckoutMutation.isPending || guestAuthMutation.isPending}
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
                <div key={item.productId} className="flex justify-between text-sm">
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
