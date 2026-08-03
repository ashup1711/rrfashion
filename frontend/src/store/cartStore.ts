import { create } from 'zustand';
import { getPersistentItem } from '../utils/persistentStorage';
import apiClient from '../api/client';
import { toast } from 'sonner';
import type { Cart } from '../api/cart';
import { useAuthStore } from './authStore';

const GUEST_CART_KEY = 'guest_cart_items';
// REQ-FE-002: server cart id is persisted so the next add re-attaches to the
// same cart instead of creating a new one. Stored separately from the items
// so an empty cart keeps its identity until cleared/merged.
const GUEST_CART_ID_KEY = 'guest_cart_id';

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

function loadCartId(): string | null {
  return localStorage.getItem(GUEST_CART_ID_KEY);
}

function saveCartId(cartId: string | null) {
  if (cartId) {
    localStorage.setItem(GUEST_CART_ID_KEY, cartId);
  } else {
    localStorage.removeItem(GUEST_CART_ID_KEY);
  }
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
  // REQ-FE-002: server cart id — persisted so subsequent adds re-attach to
  // the same cart. Null until the first server add/sync.
  cartId: string | null;
  addItem: (item: CartItemState) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  updateQuantity: (id: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  setItems: (items: CartItemState[]) => void;
  setGuestCart: (isGuest: boolean) => void;
  syncWithBackend: () => Promise<void>; // NEW: Force sync with backend
  setCartId: (cartId: string | null) => void; // REQ-FE-002
}

const initialItems = loadGuestCart();

export const useCartStore = create<CartState>((set, get) => ({
  items: initialItems,
  itemCount: initialItems.reduce((sum, i) => sum + i.quantity, 0),
  total: initialItems.reduce((sum, i) => sum + (i.salePrice ?? i.basePrice) * i.quantity, 0),
  isGuest: getIsGuest(), // Reactive — reads from persistent storage each time
  isSynced: false,
  isSyncing: false,
  cartId: loadCartId(), // REQ-FE-002: persisted server cart id

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
    
    // Sync with backend — REQ-FE-002: pass the persisted cartId so the first
    // add re-attaches to the existing server cart (auto-created if missing).
    // Don't send cartId when logged in — backend resolves cart from the token.
    const isAuthenticated = useAuthStore.getState().isAuthenticated;
    try {
      const response = await apiClient.post<Cart>('/cart/items', {
        variantId: item.variantId,
        quantity: item.quantity,
        type: item.type || 'sale',
        ...(isAuthenticated ? {} : { cartId: get().cartId || undefined }),
      });

      // REQ-FE-002: capture the server cart id + persist it so future adds
      // (and the recovery flow) keep re-attaching to the same cart.
      if (response.data?.id) {
        set({ cartId: response.data.id });
        saveCartId(response.data.id);
      }

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
      // Keep cartId — a guest cart may still exist server-side and will be
      // re-synced/merged on login. The recovery link flow depends on it.
      return;
    }
    
    try {
      await apiClient.delete('/cart');
      // REQ-FE-002: server cart is gone — drop the cached id.
      set({ isSynced: true, cartId: null });
      saveCartId(null);
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

  setGuestCart: (isGuest) => {
    set({ isGuest });
    // Also reset sync flags when transitioning to non-guest
    if (!isGuest) {
      set({ isSynced: false, isSyncing: false });
    }
  },

  // REQ-FE-002: set + persist the server cart id (used by the recovery page
  // and the add-item flow).
  setCartId: (cartId) => {
    set({ cartId });
    saveCartId(cartId);
  },

  syncWithBackend: async () => {
    const state = get();
    if (state.isGuest) return;
    
    set({ isSyncing: true });
    try {
      const response = await apiClient.get<Cart>('/cart');
      // REQ-FE-002: capture the server cart id + persist it.
      if (response.data?.id) {
        set({ cartId: response.data.id });
        saveCartId(response.data.id);
      }
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

// Helper function that reads the current guest status from persistent storage
function getIsGuest(): boolean {
  return !!getPersistentItem('guest_session_id');
}

// Subscribe to guest_session_id changes in localStorage for cross-tab consistency
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'guest_session_id' || e.key === null) {
      const currentState = useCartStore.getState();
      const newIsGuest = getIsGuest();
      if (currentState.isGuest !== newIsGuest) {
        useCartStore.setState({ isGuest: newIsGuest });
      }
    }
  });
}
