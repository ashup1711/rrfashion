import { useQuery } from '@tanstack/react-query';
import { searchProducts, type SearchParams, type SearchResponse } from '../api/search';
import { QUERY_KEYS, STALE_TIMES } from '../utils/constants';

/**
 * Hook for product search with TanStack Query.
 * Uses the public GET /api/search endpoint.
 * SEC-14: Public catalog data — staleTime proportional to data volatility.
 * S-001: Passes AbortSignal from TanStack Query to cancel stale in-flight requests
 *        when the user types rapidly, preventing stale results from flashing.
 */
export const useSearch = (params: SearchParams) => {
  return useQuery<SearchResponse>({
    queryKey: [QUERY_KEYS.search, params],
    queryFn: ({ signal }) => searchProducts(params, signal),
    enabled: params.q.trim().length > 0,
    staleTime: STALE_TIMES.search ?? 2 * 60 * 1000, // 2 minutes for search results
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
};
