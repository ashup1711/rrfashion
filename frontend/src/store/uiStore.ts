import { create } from 'zustand';
import type { Product } from '../types/product';

interface UIState {
  quickViewProduct: Product | null;
  isQuickViewOpen: boolean;
  openQuickView: (product: Product) => void;
  closeQuickView: () => void;
  isMiniCartOpen: boolean;
  openMiniCart: () => void;
  closeMiniCart: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  quickViewProduct: null,
  isQuickViewOpen: false,
  openQuickView: (product) => set({ quickViewProduct: product, isQuickViewOpen: true }),
  closeQuickView: () => set({ isQuickViewOpen: false, quickViewProduct: null }),
  isMiniCartOpen: false,
  openMiniCart: () => set({ isMiniCartOpen: true }),
  closeMiniCart: () => set({ isMiniCartOpen: false }),
}));
