import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Button from '../../components/ui/Button';
import { recover } from '../../api/cart';
import { useCartStore } from '../../store/cartStore';
import { QUERY_KEYS, ROUTES } from '../../utils/constants';

/**
 * REQ-FE-002: abandoned-cart recovery landing page (`/cart/recover/:token`).
 *
 * The token is a signed 7-day JWT (`type: 'cart-recovery'`) minted by the
 * backend. On success the server re-attaches the cart to the current
 * identity (guest or customer). We capture the returned `cart.id` into the
 * persisted cart store, invalidate the cart query, then redirect to /cart.
 *
 * Loading / success / error (invalid, expired, or already-used token) are
 * each handled explicitly.
 */
const Recover = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('This recovery link is invalid or has expired.');
  const ranRef = useRef(false);

  const handleRecover = useCallback(async () => {
    if (!token) {
      setErrorMessage('This recovery link is missing its token.');
      setStatus('error');
      return;
    }
    setStatus('loading');
    try {
      const result = await recover(token);
      // REQ-FE-002: persist the re-attached server cart id so the next add
      // keeps re-using the same cart.
      if (result?.cart?.id) {
        useCartStore.getState().setCartId(result.cart.id);
      }
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.cart] });
      setStatus('success');
      toast.success('Your saved cart has been restored!');
      navigate(ROUTES.CART);
    } catch (err: unknown) {
      console.error('Cart recovery failed:', err);
      const msg =
        (err as { message?: string })?.message ||
        'We could not restore your cart from this link.';
      setErrorMessage(msg);
      setStatus('error');
    }
  }, [token, navigate, queryClient]);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;
    handleRecover();
  }, [handleRecover]);

  if (status === 'loading') {
    return (
      <div className="container mx-auto px-4 py-20">
        <LoadingSpinner size="lg" label="Restoring your cart..." />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-20 text-center">
      <div className="max-w-md mx-auto">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Cart Recovery Unavailable</h1>
        <p className="text-gray-600 mb-8 leading-relaxed">{errorMessage}</p>
        <div className="flex justify-center gap-3">
          <Link to={ROUTES.CART}>
            <Button variant="outline">Go to Cart</Button>
          </Link>
          <Link to={ROUTES.SHOP}>
            <Button>Continue Shopping</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Recover;
