import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getCart, addCartItem, updateCartItem, removeFromCart } from '../api/cart';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { getPersistentItem } from '../utils/persistentStorage';
import { QUERY_KEYS, ROUTES } from '../utils/constants';
import { useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export const useCart = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setItems, items, syncWithBackend, isSynced, isSyncing } = useCartStore();
  const itemCount = useCartStore((state) => state.itemCount);
  const total = useCartStore((state) => state.total);

  // Interceptor always provides the best available token (admin_token > auth_token > guest_token)
  // via Authorization: Bearer header, so the request is always credentials-ready.
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasGuestSession = !!getPersistentItem('guest_session_id');
  const hasCredentials = isAuthenticated || hasGuestSession;

  const cartQuery = useQuery({
    queryKey: [QUERY_KEYS.cart],
    queryFn: getCart,
    staleTime: 1000 * 60,
    enabled: hasCredentials,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
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
      addCartItem(variantId, quantity, type),
    onSuccess: (data) => {
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
    (variantId: string, quantity: number, type?: string) => {
      const normalizedType = type || 'sale';
      const alreadyInCart = items.some(
        (i) => i.variantId === variantId && (i.type ?? 'sale') === normalizedType,
      );
      if (alreadyInCart) {
        toast.info('This item is already in your cart');
        return;
      }
      addItemMutation.mutate({ variantId, quantity, type: normalizedType });
    },
    [items, addItemMutation],
  );

  return {
    items,
    itemCount,
    total,
    serverItems: cartQuery.data?.items,
    isLoading: cartQuery.isLoading,
    isSyncing, // NEW
    error: cartQuery.error,
    addItem: handleAddItem,
    updateQuantity: (itemId: string, quantity: number) =>
      updateItemMutation.mutate({ itemId, quantity }),
    removeItem: (itemId: string) => removeItemMutation.mutate(itemId),
    isAdding: addItemMutation.isPending,
    isUpdating: updateItemMutation.isPending,
    isRemoving: removeItemMutation.isPending,
    refetch: cartQuery.refetch,
    syncWithBackend, // NEW
    isSynced, // NEW
  };
};
