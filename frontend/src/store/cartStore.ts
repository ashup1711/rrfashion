import { create } from 'zustand';
import { getPersistentItem } from '../utils/persistentStorage';
import apiClient from '../api/client';
import { toast } from 'sonner';
import type { Cart } from '../api/cart';

const GUEST_CART_KEY = 'guest_cart_items';

function loadGuestCart(): CartItemState[] {
  try {
    const stored = localStorage.getItem(GUEST_CART_KEY);
    return stored ? JSON.parse(stored) : [];
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

function calculateItemCount(items: CartItemState[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}

function calculateTotal(items: CartItemState[]): number {
  return items.reduce((sum, i) => sum + (i.salePrice ?? i.basePrice) * i.quantity, 0);
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
  isOptimistic?: boolean; // Flag for optimistic updates
}

interface CartState {
  items: CartItemState[];
  itemCount: number;
  total: number;
  isGuest: boolean;
  isSynced: boolean; // NEW: Track sync status with backend
  isSyncing: boolean; // NEW: Track if syncing is in progress
  addItem: (item: CartItemState) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  updateQuantity: (id: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  setItems: (items: CartItemState[]) => void;
  setGuestCart: (isGuest: boolean) => void;
  syncWithBackend: () => Promise<void>; // NEW: Force sync with backend
}

const initialItems = loadGuestCart();

export const useCartStore = create<CartState>((set, get) => ({
  items: initialItems,
  itemCount: initialItems.reduce((sum, i) => sum + i.quantity, 0),
  total: initialItems.reduce((sum, i) => sum + (i.salePrice ?? i.basePrice) * i.quantity, 0),
  isGuest: !!getPersistentItem('guest_session_id'),
  isSynced: false,
  isSyncing: false,

  addItem: async (item) => {
    const state = get();
    const existing = state.items.find((i) => i.variantId === item.variantId && i.variantId != null);
    
    // Optimistic update - update UI immediately
    let newItems;
    if (existing) {
      newItems = state.items.map((i) =>
        i.variantId === item.variantId && i.variantId != null
          ? { ...i, quantity: i.quantity + item.quantity, type: item.type || i.type }
          : i,
      );
    } else {
      newItems = [...state.items, { ...item, isOptimistic: true }];
    }
    
    // Update local state immediately
    set({
      items: newItems,
      itemCount: calculateItemCount(newItems),
      total: calculateTotal(newItems),
      isSynced: false,
    });
    
    if (state.isGuest) {
      saveGuestCart(newItems);
      return;
    }
    
    // Sync with backend
    try {
      const response = await apiClient.post<Cart>('/cart/add', {
        variantId: item.variantId,
        quantity: item.quantity,
        type: item.type || 'sale',
      });
      
      // Update with confirmed data from server
      if (response.data?.items) {
        const confirmedItems = response.data.items.map(dbItem => ({
          id: dbItem.id,
          productId: dbItem.productId,
          variantId: dbItem.variantId ?? undefined,
          name: dbItem.product?.name || item.name,
          basePrice: dbItem.product?.basePrice || item.basePrice,
          salePrice: dbItem.variant?.salePrice ?? item.salePrice,
          image: dbItem.product?.images?.[0] || item.image,
          quantity: dbItem.quantity,
          type: dbItem.type,
        }));
        
        set({
          items: confirmedItems,
          itemCount: calculateItemCount(confirmedItems),
          total: calculateTotal(confirmedItems),
          isSynced: true,
        });
      }
    } catch (error) {
      // Rollback on error
      set(state);
      toast.error('Failed to add item to cart. Please try again.');
      throw error;
    }
  },

  removeItem: async (id) => {
    const state = get();
    const itemToRemove = state.items.find(i => 
      i.id === id || (!i.id && (i.variantId ?? i.productId) === id)
    );
    
    if (!itemToRemove) return;
    
    // Optimistic update
    const newItems = state.items.filter((i) => 
      !((i.id && i.id === id) || (!i.id && (i.variantId ?? i.productId) === id))
    );
    
    set({
      items: newItems,
      itemCount: calculateItemCount(newItems),
      total: calculateTotal(newItems),
      isSynced: false,
    });
    
    if (state.isGuest) {
      saveGuestCart(newItems);
      return;
    }
    
    // Sync with backend
    try {
      if (itemToRemove.id) {
        // Authenticated user - use itemId
        await apiClient.delete(`/cart/items/${itemToRemove.id}`);
      }
      set({ isSynced: true });
    } catch (error) {
      // Rollback on error
      set(state);
      toast.error('Failed to remove item from cart. Please try again.');
      throw error;
    }
  },

  updateQuantity: async (id, quantity) => {
    const state = get();
    
    // Optimistic update
    const newItems = state.items.map((i) =>
      (i.id && i.id === id) || (!i.id && (i.variantId ?? i.productId) === id)
        ? { ...i, quantity }
        : i,
    );
    
    set({
      items: newItems,
      itemCount: calculateItemCount(newItems),
      total: calculateTotal(newItems),
      isSynced: false,
    });
    
    if (state.isGuest) {
      saveGuestCart(newItems);
      return;
    }
    
    // Sync with backend
    try {
      if (quantity > 0) {
        await apiClient.patch(`/cart/items/${id}`, { quantity });
      } else {
        await apiClient.delete(`/cart/items/${id}`);
      }
      set({ isSynced: true });
    } catch (error) {
      // Rollback on error
      set(state);
      toast.error('Failed to update quantity. Please try again.');
      throw error;
    }
  },

  clearCart: async () => {
    const state = get();
    
    set({ items: [], itemCount: 0, total: 0, isSynced: false });
    
    if (state.isGuest) {
      clearGuestCartStorage();
      return;
    }
    
    try {
      await apiClient.delete('/cart');
      set({ isSynced: true });
    } catch (error) {
      set(state);
      toast.error('Failed to clear cart. Please try again.');
      throw error;
    }
  },

  setItems: (items) =>
    set({
      items,
      itemCount: calculateItemCount(items),
      total: calculateTotal(items),
    }),

  setGuestCart: (isGuest) => set({ isGuest }),

  syncWithBackend: async () => {
    const state = get();
    if (state.isGuest) return;
    
    set({ isSyncing: true });
    try {
      const response = await apiClient.get<Cart>('/cart');
      if (response.data?.items) {
        const syncedItems = response.data.items.map(dbItem => ({
          id: dbItem.id,
          productId: dbItem.productId,
          variantId: dbItem.variantId ?? undefined,
          name: dbItem.product?.name || 'Product',
          basePrice: dbItem.product?.basePrice || 0,
          salePrice: dbItem.variant?.salePrice,
          image: dbItem.product?.images?.[0] || '/images/placeholder.svg',
          quantity: dbItem.quantity,
          type: dbItem.type,
        }));
        
        set({
          items: syncedItems,
          itemCount: calculateItemCount(syncedItems),
          total: calculateTotal(syncedItems),
          isSynced: true,
          isSyncing: false,
        });
      }
    } catch (error) {
      console.error('Failed to sync cart with backend:', error);
      set({ isSynced: false, isSyncing: false });
    }
  },
}));
