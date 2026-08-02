import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

/**
 * REQ-FE-BP-001: lazy() wrapper that retries a failed dynamic import.
 * Fixes transient blank pages caused by stale service-worker chunks
 * (common with vite-plugin-pwa). Falls through to the real error after
 * `retries` attempts so ErrorBoundary still handles persistent failures.
 */
export function retryLazy<T extends ComponentType<any>>(
  loader: () => Promise<{ default: T }>,
  retries = 2,
): LazyExoticComponent<T> {
  return lazy(() =>
    loader().catch((error: unknown) => {
      if (retries <= 0) throw error;
      return new Promise((resolve) => setTimeout(resolve, 500)).then(() =>
        loader().catch((retryError: unknown) => {
          if (retries - 1 <= 0) throw retryError;
          return new Promise((resolve2) => setTimeout(resolve2, 800)).then(() => loader());
        }),
      ) as Promise<{ default: T }>;
    }),
  );
}
