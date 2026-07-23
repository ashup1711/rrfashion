import { useMemo } from 'react';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import { useCart } from '../../../hooks/useCart';
import { formatCurrency } from '../../../utils/formatCurrency';

const OrderSummary = () => {
  const { items, total, isLoading, error } = useCart();

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.name.localeCompare(b.name)),
    [items],
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-neutral-light p-8 rounded-2xl border border-neutral-medium shadow-sm">
        <h3 className="text-xl font-display text-primary-900 mb-6 uppercase tracking-widest border-b border-neutral-medium pb-4">Order Summary</h3>
        <LoadingSpinner size="sm" label="Loading cart items..." />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-neutral-light p-8 rounded-2xl border border-neutral-medium shadow-sm">
        <h3 className="text-xl font-display text-primary-900 mb-6 uppercase tracking-widest border-b border-neutral-medium pb-4">Order Summary</h3>
        <p className="text-sm font-medium text-error flex items-center gap-2" role="alert">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Unable to load cart items.
        </p>
      </div>
    );
  }

  // Empty state
  if (!items.length) {
    return (
      <div className="bg-neutral-light p-8 rounded-2xl border border-neutral-medium shadow-sm">
        <h3 className="text-xl font-display text-primary-900 mb-6 uppercase tracking-widest border-b border-neutral-medium pb-4">Order Summary</h3>
        <p className="text-sm text-neutral-dark font-medium uppercase tracking-wider">Your cart is empty.</p>
      </div>
    );
  }

  return (
    <div className="bg-neutral-light p-8 rounded-2xl border border-neutral-medium shadow-sm">
      <h3 className="text-xl font-display text-primary-900 mb-6 uppercase tracking-widest border-b border-neutral-medium pb-4">Order Summary</h3>

      {/* Cart Items */}
      <div className="space-y-4 mb-8 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar" role="list" aria-label="Items in your order">
        {sortedItems.map((item) => {
          const unitPrice = item.salePrice ?? item.basePrice;
          const isRent = item.type === 'rent';
          return (
            <div
              key={item.id ?? `${item.variantId ?? item.productId}-${item.type ?? 'sale'}`}
              className="flex items-center gap-4"
              role="listitem"
            >
              <div className="relative w-16 h-20 flex-shrink-0 bg-white rounded-lg border border-neutral-medium overflow-hidden">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400&q=80';
                  }}
                />
                {isRent && (
                  <div className="absolute bottom-0 left-0 right-0 bg-primary-500 text-white text-[8px] font-bold uppercase text-center py-0.5">
                    Rent
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-primary-900 truncate uppercase tracking-tight">{item.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-neutral-dark font-medium">Qty: {item.quantity}</span>
                  <span className="w-1 h-1 bg-neutral-medium rounded-full" />
                  <span className="text-xs text-primary-900 font-bold">{formatCurrency(unitPrice)}</span>
                </div>
              </div>
              <p className="text-sm font-bold text-primary-900">
                {formatCurrency(unitPrice * item.quantity)}
              </p>
            </div>
          );
        })}
      </div>

      {/* Totals */}
      <div className="border-t border-neutral-medium pt-6 space-y-4">
        <div className="flex justify-between items-center text-sm">
          <span className="text-neutral-dark font-medium uppercase tracking-wider">Subtotal</span>
          <span className="text-primary-900 font-bold">{formatCurrency(total)}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-neutral-dark font-medium uppercase tracking-wider">Shipping</span>
          <span className="text-success font-bold uppercase tracking-wider">Free</span>
        </div>
        <div className="border-t border-neutral-medium pt-4 mt-4 flex justify-between items-center">
          <span className="text-base font-bold text-primary-900 uppercase tracking-widest">Grand Total</span>
          <span className="text-2xl font-display text-primary-900">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
};

export default OrderSummary;
