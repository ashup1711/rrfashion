import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCart, addCartItem, updateCartItem, removeFromCart } from '../api/cart';
import { useCartStore } from '../store/cartStore';
import { QUERY_KEYS } from '../utils/constants';
import { useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export const useCart = () => {
  const queryClient = useQueryClient();
  const { setItems } = useCartStore();
  const itemCount = useCartStore((state) => state.itemCount);
  const total = useCartStore((state) => state.total);
  const items = useCartStore((state) => state.items);

  // Interceptor always provides the best available token (admin_token > auth_token > guest_token)
  // via Authorization: Bearer header, so the request is always credentials-ready.
  const hasCredentials = true;

  const cartQuery = useQuery({
    queryKey: [QUERY_KEYS.cart],
    queryFn: getCart,
    staleTime: 1000 * 60,
    enabled: hasCredentials,
    retry: false,
  });

  useEffect(() => {
    if (cartQuery.data) {
      const mappedItems = cartQuery.data.items.map((item) => ({
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
    }
  }, [cartQuery.data, setItems]);

  const addItemMutation = useMutation({
    mutationFn: ({ variantId, quantity, type }: { variantId: string; quantity: number; type?: string }) =>
      addCartItem(variantId, quantity, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.cart] });
    },
    onError: (error) => {
      console.error('Failed to add to cart:', error);
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      updateCartItem(itemId, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.cart] });
    },
    onError: (error) => {
      console.error('Failed to update cart item:', error);
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: (itemId: string) => removeFromCart(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.cart] });
    },
    onError: (error) => {
      console.error('Failed to remove from cart:', error);
    },
  });

  const handleAddItem = useCallback(
    (variantId: string, quantity: number, type?: string) => {
      const normalizedType = type || 'sale';
      const alreadyInCart = items.some(
        (i) => i.variantId === variantId && (i.type ?? 'sale') === normalizedType,
      );
      if (alreadyInCart) {
        toast.info('Item already in your cart');
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
    error: cartQuery.error,
    addItem: handleAddItem,
    updateQuantity: (itemId: string, quantity: number) =>
      updateItemMutation.mutate({ itemId, quantity }),
    removeItem: (itemId: string) => removeItemMutation.mutate(itemId),
    isAdding: addItemMutation.isPending,
    isUpdating: updateItemMutation.isPending,
    isRemoving: removeItemMutation.isPending,
    refetch: cartQuery.refetch,
  };
};
