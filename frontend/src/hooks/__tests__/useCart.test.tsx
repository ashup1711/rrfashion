import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCart } from '../useCart';
import * as cartApi from '../../api/cart';
import { useCartStore } from '../../store/cartStore';
import type { ReactNode } from 'react';

// Mock the API module
vi.mock('../../api/cart', () => ({
  getCart: vi.fn(),
  addCartItem: vi.fn(),
  updateCartItem: vi.fn(),
  removeFromCart: vi.fn(),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useCart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCartStore.getState().setItems([]);
  });

  it('should fetch cart and populate store on success', async () => {
    const mockItems = [
      {
        id: 'item-1',
        productId: 'prod-1',
        variantId: 'var-1',
        quantity: 2,
        type: 'sale',
        product: { name: 'Test Product', basePrice: 1000, images: ['img.jpg'] },
        variant: { salePrice: 900 },
      },
    ];
    vi.mocked(cartApi.getCart).mockResolvedValue({ id: 'cart-1', items: mockItems, total: 1800 });

    const { result } = renderHook(() => useCart(), { wrapper: createWrapper() });

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    // Wait for the query to complete
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Items should be mapped and set in the store
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].name).toBe('Test Product');
    expect(result.current.items[0].quantity).toBe(2);
  });

  it('should handle API error gracefully (no onError crash)', async () => {
    vi.mocked(cartApi.getCart).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useCart(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Error should be set on the query result
    expect(result.current.error).toBeDefined();
    // Items should remain empty (from store initialization)
    expect(result.current.items).toEqual([]);
  });

  it('should handle malformed API response (items is null)', async () => {
    vi.mocked(cartApi.getCart).mockResolvedValue({ id: 'cart-1', items: null as any, total: 0 });

    const { result } = renderHook(() => useCart(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Should not throw — Array.isArray guard prevents crash
    expect(result.current.items).toEqual([]);
  });

  it('should handle malformed API response (items is undefined)', async () => {
    vi.mocked(cartApi.getCart).mockResolvedValue({ id: 'cart-1', items: undefined as any, total: 0 });

    const { result } = renderHook(() => useCart(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.items).toEqual([]);
  });
});
