import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getWishlist, addToWishlist, removeFromWishlist, addAllWishlistToCart, type WishlistItem as ApiWishlistItem } from '../api/wishlist';
import { useWishlistStore, type WishlistItem as GuestWishlistItem } from '../store/wishlistStore';
import { useAuthStore } from '../store/authStore';
import { useGuestSession } from './useGuestSession';
import { QUERY_KEYS } from '../utils/constants';
import { useCallback, useEffect, useMemo } from 'react';

export type WishlistEntry = ApiWishlistItem | GuestWishlistItem;

export const isApiWishlistItem = (item: WishlistEntry): item is ApiWishlistItem =>
  (item as ApiWishlistItem).variant !== undefined;

export const useWishlist = () => {
  const queryClient = useQueryClient();
  const { setGuestItems, guestItems, addGuestItem, removeGuestItem } = useWishlistStore();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { hasGuestToken } = useGuestSession();
  const hasCredentials = hasGuestToken || isAuthenticated;

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
    onMutate: async (_variantId) => {
      // Cancel ongoing queries so they don't overwrite optimistic update
      await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.wishlist] });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.wishlist] });
      toast.success('Added to wishlist!');
    },
    onError: (error) => {
      console.error('Failed to add to wishlist:', error);
      toast.error('Failed to add to wishlist. Please try again.');
    },
  });

  const removeMutation = useMutation({
    mutationFn: (variantId: string) => removeFromWishlist(variantId),
    onMutate: async (variantId) => {
      // Cancel ongoing queries so they don't overwrite optimistic update
      await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.wishlist] });

      // For guest users, optimistically remove from local store
      if (!isAuthenticated) {
        removeGuestItem(variantId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.wishlist] });
      toast.success('Removed from wishlist');
    },
    onError: (error) => {
      console.error('Failed to remove from wishlist:', error);
      toast.error('Failed to remove from wishlist. Please try again.');
      // Refetch to revert optimistic state
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.wishlist] });
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
      toast.error('Failed to add items to cart. Please try again.');
    },
  });

  const items = useMemo<WishlistEntry[]>(() => {
    if (isAuthenticated) {
      return wishlistQuery.data || [];
    }
    return guestItems;
  }, [isAuthenticated, wishlistQuery.data, guestItems]);

  const handleAddItem = useCallback((variantId: string, notifyOnPriceDrop?: boolean) => {
    // For guest users, optimistically add to local store
    if (!isAuthenticated) {
      addGuestItem({ variantId });
    }
    addMutation.mutate({ variantId, notifyOnPriceDrop });
  }, [isAuthenticated, addMutation, addGuestItem]);

  const handleRemoveItem = useCallback((variantId: string) => {
    // For guest users, optimistically remove from local store
    if (!isAuthenticated) {
      removeGuestItem(variantId);
    }
    removeMutation.mutate(variantId);
  }, [isAuthenticated, removeMutation, removeGuestItem]);

  return {
    items,
    isLoading: wishlistQuery.isLoading,
    error: wishlistQuery.error,
    addItem: handleAddItem,
    removeItem: handleRemoveItem,
    isAdding: addMutation.isPending,
    addAllToCart: addAllToCartMutation.mutateAsync,
    isAddingAllToCart: addAllToCartMutation.isPending,
    refetch: wishlistQuery.refetch,
  };
};
