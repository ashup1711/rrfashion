import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getCart, addCartItem, updateCartItem, removeFromCart } from '../api/cart';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { useGuestStore } from '../store/guestStore';
import { QUERY_KEYS, ROUTES } from '../utils/constants';
import { useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import type { CartItemState } from '../store/cartStore';

export const useCart = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setItems, items, syncWithBackend, isSynced, isSyncing, addItem: addItemToStore, removeItem: removeItemFromStore, updateQuantity: updateQuantityInStore } = useCartStore();
  const itemCount = useCartStore((state) => state.itemCount);
  const total = useCartStore((state) => state.total);

  // Interceptor always provides the best available token (admin_token > auth_token > guest_token)
  // via Authorization: Bearer header, so the request is always credentials-ready.
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  // Use reactive guest session ID from guestStore instead of static getPersistentItem snapshot
  const guestSessionId = useGuestStore((s) => s.guestSessionId);
  const hasCredentials = isAuthenticated || !!guestSessionId;

  const cartQuery = useQuery({
    queryKey: [QUERY_KEYS.cart],
    queryFn: getCart,
    staleTime: 1000 * 60,
    enabled: hasCredentials,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    // Persist guest cart data in the cache across navigations
    gcTime: 1000 * 60 * 30, // Keep in garbage collection cache for 30 min (formerly cacheTime)
  });

  // Handle cart query errors via side effect (React Query v5 removed onError from useQuery options)
  useEffect(() => {
    if (cartQuery.error) {
      console.error('Failed to fetch cart:', cartQuery.error);
      toast.error('Unable to load your cart. Please refresh the page.');
    }
  }, [cartQuery.error]);

  useEffect(() => {
    if (cartQuery.data) {
      // Guard against unexpected API response shape (e.g., { items: null })
      const itemsData = cartQuery.data.items;
      if (Array.isArray(itemsData)) {
        const mappedItems = itemsData.map((item) => ({
          id: item.id,
          productId: item.productId,
          variantId: item.variantId ?? undefined,
          name: item.product?.name ?? 'Product',
          basePrice: item.product?.basePrice ?? 0,
          salePrice: item.variant?.salePrice ?? undefined,
          image: item.product?.images?.[0] ?? 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400&q=80',
          quantity: item.quantity,
          type: item.type,
        }));
        setItems(mappedItems);
      } else {
        console.warn('useCart: Expected cartQuery.data.items to be an array, got:', typeof itemsData);
      }
    }
  }, [cartQuery.data, setItems]);

  // Sync with backend when coming back online or on focus
  useEffect(() => {
    const onFocus = () => {
      if (!isSynced && !isSyncing && document.visibilityState === 'visible') {
        syncWithBackend();
      }
    };
    
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onFocus);
    
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onFocus);
    };
  }, [isSynced, isSyncing, syncWithBackend]);

  const addItemMutation = useMutation({
    mutationFn: ({ variantId, quantity, type }: { variantId: string; quantity: number; type?: string }) =>
      addCartItem(variantId, quantity, type, useCartStore.getState().cartId),
    onSuccess: (data) => {
      // REQ-FE-002: capture + persist the server cart id so subsequent adds
      // and the recovery flow re-attach to the same cart.
      if (data?.id) {
        useCartStore.getState().setCartId(data.id);
      }
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.cart] });
      toast.success('Item added to cart', {
        action: {
          label: 'View Cart',
          onClick: () => navigate(ROUTES.CART),
        },
        duration: 3000,
      });
    },
    onError: (error: any) => {
      console.error('Failed to add to cart:', error);
      const errorMessage = error?.response?.data?.message || 
                          error?.message || 
                          'Failed to add item to cart. Please try again.';
      toast.error(errorMessage, {
        duration: 5000,
      });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      updateCartItem(itemId, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.cart] });
      toast.success('Cart updated');
    },
    onError: (error: any) => {
      console.error('Failed to update cart item:', error);
      const errorMessage = error?.response?.data?.message || 
                          'Failed to update quantity. Please try again.';
      toast.error(errorMessage);
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: (itemId: string) => removeFromCart(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.cart] });
      toast.success('Item removed from cart');
    },
    onError: (error: any) => {
      console.error('Failed to remove from cart:', error);
      const errorMessage = error?.response?.data?.message || 
                          'Failed to remove item. Please try again.';
      toast.error(errorMessage);
    },
  });

  const handleAddItem = useCallback(
    async (variantId: string, quantity: number, type?: string): Promise<void> => {
      const normalizedType = type || 'sale';
      const alreadyInCart = items.some(
        (i) => i.variantId === variantId && (i.type ?? 'sale') === normalizedType,
      );
      if (alreadyInCart) {
        toast.info('This item is already in your cart');
        return;
      }

      // Guest user path — handle BOTH initialized and non-initialized sessions
      // The local store add is independent of backend auth, so we can always add optimistically
      if (!isAuthenticated) {
        const newItem: CartItemState = {
          productId: variantId,
          variantId,
          name: 'Product',
          basePrice: 0,
          image: '/images/placeholder.svg',
          quantity,
          type: normalizedType,
          isOptimistic: true,
        };
        addItemToStore(newItem);
        toast.success('Item added to cart');
        return;
      }

      // For authenticated users, WAIT for the mutation to complete before resolving
      try {
        await addItemMutation.mutateAsync({ variantId, quantity, type: normalizedType });
      } catch (error) {
        // Error is already handled by onError in the mutation definition
        // Re-throw so the caller (handleBuyNow) knows the add failed
        throw error;
      }
    },
    [items, addItemMutation, isAuthenticated, addItemToStore],
  );

  const handleRemoveItem = useCallback(
    (itemId: string) => {
      // For guest users, optimistically remove from local store
      if (!isAuthenticated && !!guestSessionId) {
        removeItemFromStore(itemId);
        toast.success('Item removed from cart');
        return;
      }
      removeItemMutation.mutate(itemId);
    },
    [isAuthenticated, guestSessionId, removeItemMutation, removeItemFromStore],
  );

  const handleUpdateQuantity = useCallback(
    (itemId: string, quantity: number) => {
      if (!isAuthenticated && !!guestSessionId) {
        updateQuantityInStore(itemId, quantity);
        return;
      }
      updateItemMutation.mutate({ itemId, quantity });
    },
    [isAuthenticated, guestSessionId, updateItemMutation, updateQuantityInStore],
  );

  return {
    items,
    itemCount,
    total,
    serverItems: cartQuery.data?.items,
    isLoading: cartQuery.isLoading,
    isSyncing,
    error: cartQuery.error,
    addItem: handleAddItem,
    updateQuantity: handleUpdateQuantity,
    removeItem: handleRemoveItem,
    isAdding: addItemMutation.isPending,
    isUpdating: updateItemMutation.isPending,
    isRemoving: removeItemMutation.isPending,
    refetch: cartQuery.refetch,
    syncWithBackend,
    isSynced,
  };
};
