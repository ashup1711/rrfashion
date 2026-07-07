import { create } from 'zustand';
import { getPersistentItem } from '../utils/persistentStorage';

const GUEST_CART_KEY = 'guest_cart_items';

function loadGuestCart(): CartItemState[] {
  try {
    return JSON.parse(localStorage.getItem(GUEST_CART_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveGuestCart(items: CartItemState[]) {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
}

function clearGuestCartStorage() {
  localStorage.removeItem(GUEST_CART_KEY);
}

export interface CartItemState {
  id?: string;
  productId: string;
  variantId?: string;
  name: string;
  basePrice: number;
  salePrice?: number;
  image: string;
  quantity: number;
  type?: string;
}

interface CartState {
  items: CartItemState[];
  itemCount: number;
  total: number;
  isGuest: boolean;
  addItem: (item: CartItemState) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  setItems: (items: CartItemState[]) => void;
  setGuestCart: (isGuest: boolean) => void;
}

export const useCartStore = create<CartState>((set) => ({
  items: loadGuestCart(),
  itemCount: loadGuestCart().reduce((sum, i) => sum + i.quantity, 0),
  total: loadGuestCart().reduce((sum, i) => sum + (i.salePrice ?? i.basePrice) * i.quantity, 0),
  isGuest: !!getPersistentItem('guest_session_id'),

  addItem: (item) =>
    set((state) => {
      const existing = state.items.find((i) => i.variantId === item.variantId && i.variantId != null);
      let newItems;
      if (existing) {
        newItems = state.items.map((i) =>
          i.variantId === item.variantId && i.variantId != null
            ? { ...i, quantity: i.quantity + item.quantity, type: item.type || i.type }
            : i,
        );
      } else {
        newItems = [...state.items, item];
      }
      if (state.isGuest) saveGuestCart(newItems);
      return {
        items: newItems,
        itemCount: newItems.reduce((sum, i) => sum + i.quantity, 0),
        total: newItems.reduce((sum, i) => sum + (i.salePrice ?? i.basePrice) * i.quantity, 0),
      };
    }),

  removeItem: (id) =>
    set((state) => {
      const newItems = state.items.filter(
        (i) => !((i.id && i.id === id) || (!i.id && (i.variantId ?? i.productId) === id)),
      );
      if (state.isGuest) saveGuestCart(newItems);
      return {
        items: newItems,
        itemCount: newItems.reduce((sum, i) => sum + i.quantity, 0),
        total: newItems.reduce((sum, i) => sum + (i.salePrice ?? i.basePrice) * i.quantity, 0),
      };
    }),

  updateQuantity: (id, quantity) =>
    set((state) => {
      const newItems = state.items.map((i) =>
        (i.id && i.id === id) || (!i.id && (i.variantId ?? i.productId) === id)
          ? { ...i, quantity }
          : i,
      );
      if (state.isGuest) saveGuestCart(newItems);
      return {
        items: newItems,
        itemCount: newItems.reduce((sum, i) => sum + i.quantity, 0),
        total: newItems.reduce((sum, i) => sum + (i.salePrice ?? i.basePrice) * i.quantity, 0),
      };
    }),

  clearCart: () => {
    clearGuestCartStorage();
    return set({ items: [], itemCount: 0, total: 0 });
  },

  setItems: (items) =>
    set({
      items,
      itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
      total: items.reduce((sum, i) => sum + (i.salePrice ?? i.basePrice) * i.quantity, 0),
    }),

  setGuestCart: (isGuest) => set({ isGuest }),
}));
