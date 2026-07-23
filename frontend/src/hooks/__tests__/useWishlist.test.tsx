import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

vi.mock('../../api/wishlist', () => ({
  getWishlist: vi.fn(),
  addToWishlist: vi.fn(),
  removeFromWishlist: vi.fn(),
  addAllWishlistToCart: vi.fn(),
}));

const authState: { isAuthenticated: boolean } = { isAuthenticated: false };
vi.mock('../../store/authStore', () => ({
  useAuthStore: (selector: any) => selector({ isAuthenticated: authState.isAuthenticated }),
}));

const guestState: { items: Array<{ variantId: string }> } = { items: [] };
const guestStoreState = {
  get guestItems() {
    return guestState.items;
  },
  addGuestItem: vi.fn(),
  removeGuestItem: vi.fn(),
  clearGuestItems: vi.fn(),
  setGuestItems: vi.fn(),
};
vi.mock('../../store/wishlistStore', () => ({
  useWishlistStore: (selector?: any) => (selector ? selector(guestStoreState) : guestStoreState),
}));

import { useWishlist } from '../useWishlist';
import { getWishlist } from '../../api/wishlist';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return wrapper;
};

describe('useWishlist', () => {
  beforeEach(() => {
    authState.isAuthenticated = false;
    guestState.items = [];
    vi.mocked(getWishlist).mockReset();
  });

  it('returns guest items when the user is not authenticated', () => {
    guestState.items = [{ variantId: 'g1' }, { variantId: 'g2' }];
    const wrapper = createWrapper();

    const { result } = renderHook(() => useWishlist(), { wrapper });

    expect(result.current.items).toEqual([{ variantId: 'g1' }, { variantId: 'g2' }]);
    expect(result.current.items.length).toBe(2);
  });

  it('returns authed items when the user is authenticated', async () => {
    authState.isAuthenticated = true;
    guestState.items = [{ variantId: 'guest-leftover' }];
    vi.mocked(getWishlist).mockResolvedValue([
      {
        id: 'w1',
        userId: 'u1',
        variantId: 'a1',
        notifyOnRestock: false,
        notifyOnPriceDrop: false,
        createdAt: '2026-01-01',
        variant: {
          id: 'a1',
          size: 'M',
          color: 'Red',
          sku: 'sku-a1',
          salePrice: 999,
          product: { id: 'p1', name: 'Authed Product', slug: 'authed', images: ['img.jpg'] },
        },
      },
      {
        id: 'w2',
        userId: 'u1',
        variantId: 'a2',
        notifyOnRestock: false,
        notifyOnPriceDrop: false,
        createdAt: '2026-01-02',
        variant: {
          id: 'a2',
          size: 'L',
          color: 'Blue',
          sku: 'sku-a2',
          salePrice: 1499,
          product: { id: 'p2', name: 'Authed Product 2', slug: 'authed-2', images: [] },
        },
      },
    ] as any);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useWishlist(), { wrapper });

    await waitFor(() => expect(result.current.items.length).toBe(2));
    expect(result.current.items.map((i: any) => i.variantId)).toEqual(['a1', 'a2']);
  });

  it('does not mix authed and guest items in the returned list', async () => {
    authState.isAuthenticated = true;
    guestState.items = [{ variantId: 'should-not-count' }, { variantId: 'also-should-not-count' }];
    vi.mocked(getWishlist).mockResolvedValue([
      {
        id: 'w3',
        userId: 'u1',
        variantId: 'authed-only',
        notifyOnRestock: false,
        notifyOnPriceDrop: false,
        createdAt: '2026-01-01',
        variant: {
          id: 'authed-only',
          size: 'M',
          color: 'Red',
          sku: 'sku-x',
          salePrice: 0,
          product: { id: 'p3', name: 'P', slug: 'p', images: [] },
        },
      },
    ] as any);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useWishlist(), { wrapper });

    await waitFor(() => expect(result.current.items.length).toBe(1));
    expect((result.current.items[0] as any).variantId).toBe('authed-only');
    expect((result.current.items[0] as any).variant).toBeDefined();
  });
});
