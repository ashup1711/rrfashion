import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useLandingPageData } from './useLandingPageData';

vi.mock('./useCategories', () => ({
  useCategories: vi.fn(),
}));

vi.mock('./useProducts', () => ({
  useProducts: vi.fn(),
}));

import { useCategories } from './useCategories';
import { useProducts } from './useProducts';

describe('useLandingPageData (REQ-FE-LP-001)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCategories).mockReturnValue({
      data: [{ id: 'c1', slug: 'womens-kurtis', name: 'Kurtis' }],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);
    vi.mocked(useProducts).mockReturnValue({
      data: { items: [], meta: { total: 0, page: 1, limit: 8, totalPages: 0 } },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);
  });

  it('returns five sections with success status', () => {
    const { result } = renderHook(() => useLandingPageData());
    expect(Object.keys(result.current).sort()).toEqual([
      'bestSellers',
      'categories',
      'featured',
      'newArrivals',
      'onSale',
    ]);
    expect(result.current.categories.status).toBe('success');
    expect(result.current.newArrivals.status).toBe('success');
    expect(result.current.bestSellers.status).toBe('success');
    expect(result.current.onSale.status).toBe('success');
    expect(result.current.featured.status).toBe('success');
  });

  it('isolates a failed products query as an error section while categories still succeed', () => {
    vi.mocked(useProducts).mockReturnValueOnce({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('products boom'),
      refetch: vi.fn(),
    } as any);

    const { result } = renderHook(() => useLandingPageData());
    expect(result.current.newArrivals.status).toBe('error');
    expect(result.current.newArrivals.error?.message).toBe('products boom');
    expect(result.current.categories.status).toBe('success');
    expect(result.current.bestSellers.status).toBe('success');
  });

  it('maps loading queries to the loading status', () => {
    vi.mocked(useProducts).mockReturnValueOnce({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    const { result } = renderHook(() => useLandingPageData());
    expect(result.current.newArrivals.status).toBe('loading');
  });
});
