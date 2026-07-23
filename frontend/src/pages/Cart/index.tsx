import { Link } from 'react-router-dom';
import CartItem from './components/CartItem';
import CartSummary from './components/CartSummary';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import FreeShippingBar from '../../components/common/FreeShippingBar';
import Button from '../../components/ui/Button';
import { useCart } from '../../hooks/useCart';
import { useAuthStore } from '../../store/authStore';
import { getGuestToken } from '../../utils/guestSession';
import { ROUTES } from '../../utils/constants';

const Cart = () => {
  const { items, removeItem, updateQuantity, isLoading, total } = useCart();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasGuestToken = !!getGuestToken();
  const hasItems = items.length > 0;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-display text-primary-900 mb-8 border-b border-neutral-medium pb-6 uppercase tracking-wider">Shopping Cart</h1>
        <LoadingSpinner label="Loading cart..." />
      </div>
    );
  }

  if (!hasItems) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-md mx-auto">
          <div className="w-24 h-24 bg-neutral-light rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-neutral-dark opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <h2 className="text-3xl font-display text-primary-900 mb-4 uppercase tracking-wider">Your Cart is Empty</h2>
          <p className="text-neutral-dark mb-10 leading-relaxed">Looks like you haven't added anything to your cart yet. Start exploring our latest collections to find something special.</p>
          <Link to={ROUTES.SHOP}>
            <Button size="lg" className="px-10 py-4 uppercase tracking-widest font-bold">Start Shopping</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-neutral-white min-h-screen">
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 border-b border-neutral-medium pb-6 gap-4">
          <h1 className="text-3xl font-display text-primary-900 uppercase tracking-widest">Shopping Cart</h1>
          <p className="text-sm text-neutral-dark font-medium uppercase tracking-wider">
            {items.length} {items.length === 1 ? 'Item' : 'Items'} in your cart
          </p>
        </div>

        {!isAuthenticated && hasGuestToken && (
          <div className="mb-8 p-4 bg-primary-50 border border-primary-200 rounded-lg flex items-center gap-3">
            <svg className="w-5 h-5 text-primary-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-primary-900 font-medium">
              You're shopping as a guest.{' '}
              <Link to={ROUTES.LOGIN} className="text-primary-600 underline hover:text-primary-700 transition-colors">
                Sign in
              </Link>{' '}
              to sync your cart across devices.
            </p>
          </div>
        )}

        <div className="lg:grid lg:grid-cols-3 lg:gap-12">
          <div className="lg:col-span-2 space-y-6">
            <FreeShippingBar total={total} className="mb-6" />

            <div className="space-y-4">
              {items.map((item) => (
                <CartItem
                  key={item.id ?? item.variantId ?? item.productId}
                  item={item}
                  onUpdateQuantity={(qty) => updateQuantity(item.id ?? item.variantId ?? item.productId, qty)}
                  onRemove={() => removeItem(item.id ?? item.variantId ?? item.productId)}
                />
              ))}
            </div>
            
            <div className="pt-6">
              <Link to={ROUTES.SHOP} className="inline-flex items-center text-sm font-bold text-primary-900 hover:text-primary-600 transition-colors uppercase tracking-widest group">
                <svg className="w-4 h-4 mr-2 transform group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Continue Shopping
              </Link>
            </div>
          </div>

          <div className="mt-12 lg:mt-0">
            <div className="sticky top-24">
              <CartSummary />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
