import { useMemo } from 'react';
import Card from '../../../components/ui/Card';
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
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
        <LoadingSpinner size="sm" label="Loading cart items..." />
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
        <p className="text-sm text-red-600" role="alert">
          Unable to load cart items. Please refresh the page.
        </p>
      </Card>
    );
  }

  // Empty state
  if (!items.length) {
    return (
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
        <p className="text-sm text-gray-500">Your cart is empty.</p>
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>

      {/* Cart Items */}
      <div className="space-y-3 mb-4" role="list" aria-label="Items in your order">
        {sortedItems.map((item) => {
          const unitPrice = item.salePrice ?? item.basePrice;
          const isRent = item.type === 'rent';
          return (
            <div
              key={item.variantId ?? item.productId}
              className="flex items-center gap-3"
              role="listitem"
            >
              <img
                src={item.image}
                alt={item.name}
                className="w-12 h-12 object-cover rounded flex-shrink-0 bg-gray-100"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400&q=80';
                }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                <p className="text-xs text-gray-500">
                  Qty: {item.quantity}
                  {isRent && (
                    <span className="ml-1 text-blue-500 font-medium">(Rent)</span>
                  )}
                </p>
              </div>
              <p className="text-sm font-medium text-gray-900">
                {formatCurrency(unitPrice * item.quantity)}
              </p>
            </div>
          );
        })}
      </div>

      {/* Totals */}
      <div className="border-t border-gray-200 pt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Subtotal</span>
          <span className="text-gray-900">{formatCurrency(total)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Shipping</span>
          <span className="text-green-600">Free</span>
        </div>
        <div className="border-t border-gray-200 pt-2 flex justify-between">
          <span className="text-base font-semibold text-gray-900">Total</span>
          <span className="text-base font-semibold text-gray-900">{formatCurrency(total)}</span>
        </div>
      </div>
    </Card>
  );
};

export default OrderSummary;
