import { useState, useEffect, useCallback } from 'react';
import { Product } from '../types/product';

const RECENTLY_VIEWED_KEY = 'rr_recently_viewed';
const MAX_RECENT_PRODUCTS = 12;

export const useRecentlyViewed = () => {
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(RECENTLY_VIEWED_KEY);
    if (stored) {
      try {
        setRecentlyViewed(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse recently viewed products', e);
      }
    }
  }, []);

  const addProduct = useCallback((product: Product) => {
    setRecentlyViewed((prev) => {
      // Remove product if it already exists to move it to the front
      const filtered = prev.filter((p) => p.id !== product.id);
      const updated = [product, ...filtered].slice(0, MAX_RECENT_PRODUCTS);
      
      localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearRecentlyViewed = useCallback(() => {
    localStorage.removeItem(RECENTLY_VIEWED_KEY);
    setRecentlyViewed([]);
  }, []);

  return {
    recentlyViewed,
    addProduct,
    clearRecentlyViewed,
  };
};
