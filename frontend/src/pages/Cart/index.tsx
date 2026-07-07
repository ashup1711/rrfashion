import { Link } from 'react-router-dom';
import CartItem from './components/CartItem';
import CartSummary from './components/CartSummary';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Button from '../../components/ui/Button';
import { useCart } from '../../hooks/useCart';
import { useAuthStore } from '../../store/authStore';
import { getGuestToken } from '../../utils/guestSession';
import { ROUTES } from '../../utils/constants';

const Cart = () => {
  const { items, removeItem, updateQuantity, isLoading } = useCart();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasGuestToken = !!getGuestToken();
  const hasItems = items.length > 0;

  if (isLoading) {
    return (
      <div className="container-page py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Shopping Cart</h1>
        <LoadingSpinner label="Loading cart..." />
      </div>
    );
  }

  if (!hasItems) {
    return (
      <div className="container-page py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Shopping Cart</h1>
        <EmptyState
          title="Your cart is empty"
          description="Looks like you haven't added anything to your cart yet. Start shopping to find great deals!"
          action={
            <Link to={ROUTES.SHOP}>
              <Button>Continue Shopping</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="container-page py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Shopping Cart</h1>

      {!isAuthenticated && hasGuestToken && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">
            You're shopping as a guest.{' '}
            <Link to={ROUTES.LOGIN} className="font-medium text-blue-800 underline hover:text-blue-900">
              Sign in
            </Link>{' '}
            to save your cart and access your order history.
          </p>
        </div>
      )}

      <div className="lg:grid lg:grid-cols-3 lg:gap-12">
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <CartItem
              key={item.id ?? item.variantId ?? item.productId}
              item={item}
              onUpdateQuantity={(qty) => updateQuantity(item.id ?? item.variantId ?? item.productId, qty)}
              onRemove={() => removeItem(item.id ?? item.variantId ?? item.productId)}
            />
          ))}
        </div>

        <div className="mt-8 lg:mt-0">
          <CartSummary />
        </div>
      </div>
    </div>
  );
};

export default Cart;
