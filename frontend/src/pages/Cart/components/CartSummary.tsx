import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import Button from '../../../components/ui/Button';
import { formatCurrency } from '../../../utils/formatCurrency';
import { useCartStore } from '../../../store/cartStore';
import { useAuthStore } from '../../../store/authStore';
import { useApplyCoupon } from '../../../hooks/useMyOrders';
import { ROUTES, FREE_SHIPPING_THRESHOLD, STANDARD_SHIPPING_FEE } from '../../../utils/constants';
import type { CouponResult } from '../../../api/orders';

const CartSummary = () => {
  const { total } = useCartStore();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const applyCouponMutation = useApplyCoupon();
  const subtotal = total;
  const shipping = total >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_FEE;

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<CouponResult | null>(null);
  const [couponError, setCouponError] = useState('');

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

  const discountAmount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const grandTotal = subtotal + shipping - discountAmount;

  return (
    <div className="bg-neutral-light p-8 rounded-2xl border border-neutral-medium shadow-sm">
      <h3 className="text-xl font-display text-primary-900 mb-6 uppercase tracking-widest border-b border-neutral-medium pb-4">Order Summary</h3>

      <div className="space-y-4 mb-8">
        <div className="flex justify-between items-center text-sm">
          <span className="text-neutral-dark font-medium uppercase tracking-wider">Subtotal</span>
          <span className="text-primary-900 font-bold">{formatCurrency(subtotal)}</span>
        </div>
        
        <div className="flex justify-between items-center text-sm">
          <span className="text-neutral-dark font-medium uppercase tracking-wider">Shipping</span>
          <span className={shipping === 0 ? 'text-success font-bold uppercase tracking-wider' : 'text-primary-900 font-bold'}>
            {shipping === 0 ? 'Free' : formatCurrency(shipping)}
          </span>
        </div>

        {discountAmount > 0 && (
          <div className="flex justify-between items-center text-sm p-2 bg-success/10 rounded-lg">
            <span className="text-success font-medium uppercase tracking-wider">
              Discount ({appliedCoupon?.coupon?.code})
            </span>
            <span className="text-success font-bold">-{formatCurrency(discountAmount)}</span>
          </div>
        )}

        <div className="border-t border-neutral-medium pt-4 mt-4 flex justify-between items-center">
          <span className="text-lg font-bold text-primary-900 uppercase tracking-widest">Total</span>
          <span className="text-2xl font-display text-primary-900">{formatCurrency(grandTotal)}</span>
        </div>
      </div>

      {/* Coupon Section */}
      <div className="mb-8">
        {appliedCoupon ? (
          <div className="flex items-center justify-between p-4 bg-white border border-success/30 rounded-xl shadow-sm">
            <div>
              <p className="text-sm font-bold text-primary-900 uppercase tracking-wider">{appliedCoupon.coupon.code}</p>
              {appliedCoupon.coupon.description && (
                <p className="text-xs text-neutral-dark mt-0.5">{appliedCoupon.coupon.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={handleRemoveCoupon}
              className="text-xs font-bold text-error uppercase tracking-widest hover:text-red-700 transition-colors p-2"
              aria-label="Remove coupon"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <label htmlFor="coupon-code-cart" className="block text-xs font-bold text-primary-900 uppercase tracking-widest ml-1">
              Have a coupon?
            </label>
            <div className="flex gap-2">
              <input
                id="coupon-code-cart"
                type="text"
                value={couponCode}
                onChange={(e) => {
                  setCouponCode(e.target.value);
                  setCouponError('');
                }}
                placeholder="ENTER CODE"
                className="block flex-1 rounded-xl border border-neutral-medium bg-white px-4 py-3 text-sm font-medium uppercase tracking-wider placeholder:text-neutral-dark/40 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                aria-label="Coupon code"
              />
              <Button
                variant="outline"
                className="rounded-xl px-6 font-bold uppercase tracking-widest"
                onClick={handleApplyCoupon}
                isLoading={applyCouponMutation.isPending}
              >
                Apply
              </Button>
            </div>
            {couponError && (
              <p className="mt-1 text-xs font-medium text-error flex items-center gap-1 ml-1" role="alert">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {couponError}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {!isAuthenticated ? (
          <Link to={ROUTES.GUEST_CHECKOUT} className="block">
            <Button className="w-full py-4 rounded-xl uppercase tracking-widest font-bold text-sm shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all">
              Checkout as Guest
            </Button>
          </Link>
        ) : (
          <Link to={ROUTES.CHECKOUT} className="block">
            <Button className="w-full py-4 rounded-xl uppercase tracking-widest font-bold text-sm shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all">
              Proceed to Checkout
            </Button>
          </Link>
        )}
        <div className="flex items-center justify-center gap-4 pt-2 opacity-50">
          <img src="/images/payments/visa.svg" alt="Visa" className="h-4 grayscale hover:grayscale-0 transition-all" />
          <img src="/images/payments/mastercard.svg" alt="Mastercard" className="h-4 grayscale hover:grayscale-0 transition-all" />
          <img src="/images/payments/upi.svg" alt="UPI" className="h-3 grayscale hover:grayscale-0 transition-all" />
          <img src="/images/payments/razorpay.svg" alt="Razorpay" className="h-3 grayscale hover:grayscale-0 transition-all" />
        </div>
      </div>
    </div>
  );
};

export default CartSummary;
