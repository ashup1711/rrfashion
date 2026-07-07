import { create } from 'zustand';

interface WishlistItem {
  variantId: string;
  productId?: string;
  name?: string;
  image?: string;
  price?: number;
}

interface WishlistState {
  guestItems: WishlistItem[];
  addGuestItem: (item: WishlistItem) => void;
  removeGuestItem: (variantId: string) => void;
  clearGuestItems: () => void;
  setGuestItems: (items: WishlistItem[]) => void;
}

export const useWishlistStore = create<WishlistState>((set) => ({
  guestItems: JSON.parse(localStorage.getItem('guest_wishlist') || '[]'),

  addGuestItem: (item) => set((state) => {
    const exists = state.guestItems.find(i => i.variantId === item.variantId);
    if (exists) return state;
    const newItems = [...state.guestItems, item];
    localStorage.setItem('guest_wishlist', JSON.stringify(newItems));
    return { guestItems: newItems };
  }),

  removeGuestItem: (variantId) => set((state) => {
    const newItems = state.guestItems.filter(i => i.variantId !== variantId);
    localStorage.setItem('guest_wishlist', JSON.stringify(newItems));
    return { guestItems: newItems };
  }),

  clearGuestItems: () => {
    localStorage.removeItem('guest_wishlist');
    return { guestItems: [] };
  },

  setGuestItems: (items) => {
    localStorage.setItem('guest_wishlist', JSON.stringify(items));
    return { guestItems: items };
  },
}));
