import { useCategories } from './useCategories';
import { useProducts } from './useProducts';

export type SectionStatus = 'loading' | 'success' | 'error';

export interface LandingSection<T> {
  status: SectionStatus;
  data?: T;
  error?: Error;
  refetch: () => void;
}

function toSection<T>(q: {
  isLoading: boolean;
  data?: T;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}): LandingSection<T> {
  if (q.isLoading) return { status: 'loading', refetch: q.refetch };
  if (q.isError) return { status: 'error', error: q.error ?? undefined, refetch: q.refetch };
  return { status: 'success', data: q.data, refetch: q.refetch };
}

/**
 * REQ-FE-LP-001: single entry point for landing-page API data.
 * Fans out to one categories + four products queries (each with its own
 * per-section status so a partial failure never blanks the page).
 * All calls go through apiClient (guest Bearer attached by interceptor) — no raw fetch.
 */
export function useLandingPageData() {
  const categories = useCategories();                 // existing staleTime 30min
  const newArrivals = useProducts({ isNew: true, limit: 8 });
  const bestSellers = useProducts({ isBestSeller: true, limit: 8 });
  const onSale = useProducts({ isOnSale: true, limit: 8 });
  const featured = useProducts({ isFeatured: true, limit: 4 });

  return {
    categories: toSection(categories),
    newArrivals: toSection(newArrivals),
    bestSellers: toSection(bestSellers),
    onSale: toSection(onSale),
    featured: toSection(featured),
  };
}
