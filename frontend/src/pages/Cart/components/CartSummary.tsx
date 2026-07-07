import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import { formatCurrency } from '../../../utils/formatCurrency';
import { useCartStore } from '../../../store/cartStore';
import { useAuthStore } from '../../../store/authStore';
import { useApplyCoupon } from '../../../hooks/useMyOrders';
import { ROUTES } from '../../../utils/constants';
import type { CouponResult } from '../../../api/orders';

const CartSummary = () => {
  const { total } = useCartStore();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const applyCouponMutation = useApplyCoupon();
  const subtotal = total;
  const shipping = 0;

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
    <Card>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>

      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Subtotal</span>
          <span className="text-gray-900">{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Shipping</span>
          <span className="text-green-600">{shipping === 0 ? 'Free' : formatCurrency(shipping)}</span>
        </div>

        {discountAmount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">
              Discount ({appliedCoupon?.coupon?.code})
            </span>
            <span className="text-green-600">-{formatCurrency(discountAmount)}</span>
          </div>
        )}

        <div className="border-t border-gray-200 pt-3 flex justify-between">
          <span className="text-base font-semibold text-gray-900">Total</span>
          <span className="text-base font-semibold text-gray-900">{formatCurrency(grandTotal)}</span>
        </div>
      </div>

      {/* Coupon Section */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        {appliedCoupon ? (
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
        ) : (
          <div>
            <label htmlFor="coupon-code-cart" className="block text-sm font-medium text-gray-700 mb-1">
              Coupon Code
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
                placeholder="Enter code"
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
      </div>

      <div className="mt-6">
        {!isAuthenticated ? (
          <Link to={ROUTES.GUEST_CHECKOUT} className="block">
            <Button className="w-full">Checkout as Guest</Button>
          </Link>
        ) : (
          <Link to={ROUTES.CHECKOUT} className="block">
            <Button className="w-full">Proceed to Checkout</Button>
          </Link>
        )}
      </div>
    </Card>
  );
};

export default CartSummary;
