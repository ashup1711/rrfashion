import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from '../types/product';
import { toast } from 'sonner';

interface CompareState {
  items: Product[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  clearItems: () => void;
  isInCompare: (productId: string) => boolean;
}

export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product) => {
        const { items } = get();
        if (items.some((i) => i.id === product.id)) {
          toast.error('Product already in comparison list');
          return;
        }
        if (items.length >= 4) {
          toast.error('You can compare up to 4 products only');
          return;
        }
        set({ items: [...items, product] });
        toast.success('Product added to comparison');
      },
      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((i) => i.id !== productId),
        }));
      },
      clearItems: () => set({ items: [] }),
      isInCompare: (productId) => {
        return get().items.some((i) => i.id === productId);
      },
    }),
    {
      name: 'rr-fashion-compare-storage',
    }
  )
);
