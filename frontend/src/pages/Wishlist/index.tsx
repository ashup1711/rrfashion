import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useWishlist, isApiWishlistItem, type WishlistEntry } from '../../hooks/useWishlist';
import { useCart } from '../../hooks/useCart';
import { useAuthStore } from '../../store/authStore';
import { getGuestToken } from '../../utils/guestSession';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { formatCurrency } from '../../utils/formatCurrency';
import { ROUTES } from '../../utils/constants';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400&q=80';

const WishlistPage = () => {
  const { items, isLoading, error, removeItem, addAllToCart, isAddingAllToCart, refetch } = useWishlist();
  const { addItem: addToCart } = useCart();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasGuestToken = !!getGuestToken();
  const [movingToCart, setMovingToCart] = useState<string | null>(null);

  const handleRemove = (variantId: string) => {
    removeItem(variantId);
  };

  const handleMoveToCart = async (item: WishlistEntry) => {
    setMovingToCart(item.variantId);
    try {
      addToCart(item.variantId, 1, 'sale');
      removeItem(item.variantId);
      toast.success('Moved to cart!');
    } catch (err) {
      console.error('Failed to move to cart:', err);
      toast.error('Failed to move item to cart');
    } finally {
      setMovingToCart(null);
    }
  };

  if (isLoading) {
    return (
      <div className="container-page py-8">
        <LoadingSpinner label="Loading wishlist..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-page py-8">
        <EmptyState
          title="Something went wrong"
          description="Could not load your wishlist. Please try again later."
          action={
            <Button variant="outline" onClick={() => refetch()}>Try Again</Button>
          }
        />
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="container-page py-8">
        <EmptyState
          title="Your wishlist is empty"
          description="Save items you love to your wishlist and come back to them later."
          action={
            <Link to={ROUTES.SHOP}>
              <Button>Start Shopping</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const getDisplayFields = (item: WishlistEntry) => {
    if (isApiWishlistItem(item)) {
      return {
        key: item.id,
        productId: item.variant.product.id,
        productName: item.variant.product.name,
        image: item.variant.product.images?.[0] || FALLBACK_IMAGE,
        size: item.variant.size,
        color: item.variant.color,
        price: item.variant.salePrice,
      };
    }
    return {
      key: item.variantId,
      productId: item.productId || item.variantId,
      productName: item.name || 'Product',
      image: item.image || FALLBACK_IMAGE,
      size: undefined,
      color: undefined,
      price: item.price,
    };
  };

  return (
    <div className="container-page py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Wishlist</h1>
          <p className="text-sm text-gray-500 mt-1">{items.length} item{items.length !== 1 ? 's' : ''}</p>
        </div>
        {items.length > 0 && (
          <Button
            onClick={() => addAllToCart()}
            isLoading={isAddingAllToCart}
            disabled={items.length === 0}
          >
            Add All to Cart
          </Button>
        )}
      </div>

      {!isAuthenticated && hasGuestToken && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">
            You're viewing your guest wishlist.{' '}
            <Link to={ROUTES.LOGIN} className="font-medium text-blue-800 underline hover:text-blue-900">
              Sign in
            </Link>{' '}
            to save your wishlist across devices.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {items.map((item) => {
          const display = getDisplayFields(item);
          return (
            <Card key={display.key} className="flex flex-col">
              <Link to={ROUTES.PRODUCT_DETAIL(display.productId)}>
                <div className="aspect-square bg-gray-100 rounded-md overflow-hidden mb-4">
                  <img
                    src={display.image}
                    alt={display.productName}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </div>
              </Link>

              <div className="flex-1 flex flex-col">
                <Link
                  to={ROUTES.PRODUCT_DETAIL(display.productId)}
                  className="text-sm font-medium text-gray-900 hover:text-primary-600 line-clamp-2"
                >
                  {display.productName}
                </Link>

                {display.size && display.color && (
                  <p className="text-xs text-gray-500 mt-1">
                    {display.color} / {display.size}
                  </p>
                )}

                <div className="mt-2">
                  {display.price ? (
                    <span className="text-sm font-semibold text-gray-900">
                      {formatCurrency(display.price)}
                    </span>
                  ) : null}
                </div>

                <div className="mt-auto pt-4 flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => handleMoveToCart(item)}
                    isLoading={movingToCart === item.variantId}
                  >
                    Add to Cart
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(item.variantId)}
                    aria-label={`Remove ${display.productName} from wishlist`}
                    className="text-red-500 hover:text-red-700"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default WishlistPage;
