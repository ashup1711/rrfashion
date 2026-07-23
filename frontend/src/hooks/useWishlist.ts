import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getWishlist, addToWishlist, removeFromWishlist, addAllWishlistToCart, type WishlistItem as ApiWishlistItem } from '../api/wishlist';
import { useWishlistStore, type WishlistItem as GuestWishlistItem } from '../store/wishlistStore';
import { useAuthStore } from '../store/authStore';
import { QUERY_KEYS } from '../utils/constants';
import { useEffect, useMemo } from 'react';

export type WishlistEntry = ApiWishlistItem | GuestWishlistItem;

export const isApiWishlistItem = (item: WishlistEntry): item is ApiWishlistItem =>
  (item as ApiWishlistItem).variant !== undefined;

export const useWishlist = () => {
  const queryClient = useQueryClient();
  const { setGuestItems, guestItems } = useWishlistStore();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Interceptor always provides the best available token (admin_token > auth_token > guest_token)
  // via Authorization: Bearer header, so the request is always credentials-ready.
  const hasCredentials = true;

  const wishlistQuery = useQuery({
    queryKey: [QUERY_KEYS.wishlist],
    queryFn: getWishlist,
    staleTime: 1000 * 60,
    enabled: hasCredentials,
    retry: false,
  });

  useEffect(() => {
    if (wishlistQuery.data && !isAuthenticated) {
      const mappedItems = wishlistQuery.data.map((item) => ({
        variantId: item.variantId,
        productId: item.variant.product.id,
        name: item.variant.product.name,
        image: item.variant.product.images?.[0],
        price: item.variant.salePrice || 0,
      }));
      setGuestItems(mappedItems);
    }
  }, [wishlistQuery.data, isAuthenticated, setGuestItems]);

  const addMutation = useMutation({
    mutationFn: ({ variantId, notifyOnPriceDrop }: { variantId: string; notifyOnPriceDrop?: boolean }) =>
      addToWishlist(variantId, notifyOnPriceDrop),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.wishlist] });
      toast.success('Added to wishlist!');
    },
    onError: (error) => {
      console.error('Failed to add to wishlist:', error);
      toast.error('Failed to add to wishlist');
    },
  });

  const removeMutation = useMutation({
    mutationFn: (variantId: string) => removeFromWishlist(variantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.wishlist] });
    },
    onError: (error) => {
      console.error('Failed to remove from wishlist:', error);
    },
  });

  const addAllToCartMutation = useMutation({
    mutationFn: () => addAllWishlistToCart(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.cart] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.wishlist] });
      toast.success('Items added to cart!');
    },
    onError: () => {
      toast.error('Failed to add items to cart');
    },
  });

  const items = useMemo<WishlistEntry[]>(() => {
    if (isAuthenticated) {
      return wishlistQuery.data || [];
    }
    return guestItems;
  }, [isAuthenticated, wishlistQuery.data, guestItems]);

  return {
    items,
    isLoading: wishlistQuery.isLoading,
    error: wishlistQuery.error,
    addItem: (variantId: string, notifyOnPriceDrop?: boolean) =>
      addMutation.mutate({ variantId, notifyOnPriceDrop }),
    removeItem: (variantId: string) => removeMutation.mutate(variantId),
    isAdding: addMutation.isPending,
    addAllToCart: addAllToCartMutation.mutateAsync,
    isAddingAllToCart: addAllToCartMutation.isPending,
    refetch: wishlistQuery.refetch,
  };
};
