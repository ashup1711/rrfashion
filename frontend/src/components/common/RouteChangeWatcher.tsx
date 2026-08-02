import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../utils/constants';

// destination route prefix → query keys to cancel + invalidate (REQ-FE-RC-002)
const ROUTE_QUERY_KEYS: Record<string, string[]> = {
  '/shop': [QUERY_KEYS.products],
  '/products/': [QUERY_KEYS.products],
  '/cart': [QUERY_KEYS.cart],
  '/wishlist': [QUERY_KEYS.wishlist],
  '/orders': [QUERY_KEYS.orders],
  '/': [QUERY_KEYS.products, QUERY_KEYS.categories],
};

/**
 * REQ-FE-RC-002: on every SPA route change, cancel in-flight queries from the
 * previous route and refetch the destination route's active queries — data is
 * fetched on every route change without a page refresh. Belt-and-braces with
 * REQ-FE-RC-001 (refetchOnMount: 'always').
 */
export function RouteChangeWatcher() {
  const location = useLocation();
  const queryClient = useQueryClient();

  useEffect(() => {
    const entry = Object.entries(ROUTE_QUERY_KEYS).find(([path]) =>
      location.pathname.startsWith(path),
    );
    if (entry) {
      const keys = entry[1];
      // Cancel in-flight queries from the previous route, then refetch active
      // ones for this route. Iterate single keys (queryKey filter is a
      // prefix-match, not an OR-list).
      keys.forEach((key) => {
        queryClient.cancelQueries({ queryKey: [key] });
        queryClient.invalidateQueries({ queryKey: [key], refetchType: 'active' });
      });
    }
  }, [location.pathname, queryClient]);

  return null;
}
