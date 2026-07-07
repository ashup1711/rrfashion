import apiClient from './client';

export interface WishlistItem {
  id: string;
  userId: string;
  variantId: string;
  variant: {
    id: string;
    size: string;
    color: string;
    sku: string;
    salePrice?: number;
    product: { id: string; name: string; slug: string; images: string[] };
  };
  notifyOnRestock: boolean;
  notifyOnPriceDrop: boolean;
  createdAt: string;
}

export const getWishlist = async (): Promise<WishlistItem[]> => {
  const { data } = await apiClient.get<WishlistItem[]>('/wishlist');
  return data;
};

export const addToWishlist = async (variantId: string, notifyOnPriceDrop?: boolean): Promise<WishlistItem> => {
  const { data } = await apiClient.post<WishlistItem>('/wishlist', { variantId, notifyOnPriceDrop });
  return data;
};

export const removeFromWishlist = async (variantId: string): Promise<void> => {
  await apiClient.delete(`/wishlist/${variantId}`);
};

export const addAllWishlistToCart = async (): Promise<{ added: number; skipped: number; unavailable: any[] }> => {
  const { data } = await apiClient.post('/wishlist/add-all-to-cart');
  return data;
};
