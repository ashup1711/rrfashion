import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster, toast } from 'sonner';
import App from './App';
import { AuthInitializer } from './components/auth/AuthInitializer';
import ErrorBoundary from './components/common/ErrorBoundary';
import { purgeLegacyGuestCookies } from './utils/persistentStorage';
import './styles/globals.css';

// REQ-SEC-FE-002: purge legacy guest-token cookie mirrors written by older
// builds (1-year non-httpOnly SameSite=Lax — unnecessary XSS/CSRF surface).
purgeLegacyGuestCookies();

// Suppress workbox message channel closed error (race condition on navigation)
window.addEventListener('unhandledrejection', (event) => {
  const message = event.reason?.message ?? '';
  if (message.includes('message channel closed before a response was received')) {
    event.preventDefault();
  }
});

// REQ-FE-BP-001: window-level error + unhandledrejection logging so a runtime
// crash is visible in the console instead of a silent blank page. Do NOT
// auto-reload — ErrorBoundary + toasts handle user-visible recovery.
window.addEventListener('error', (event) => {
  console.error('window error:', event.error ?? event.message);
});

// REQ-FE-RC-001: refetch on route change without a page refresh.
// `refetchOnMount: 'always'` means a page remount on route change always
// issues fresh API calls; 60s staleTime reuses the cache for back-and-forth
// visits within a minute. Per-query overrides remain (categories 30min,
// cart 1min, wishlist 1min).
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,          // 60s — route visits within a minute use cache
      retry: 1,
      refetchOnMount: 'always',      // REQ-FE-RC-001: page remount on route change always refetches
      refetchOnWindowFocus: true,    // visible again → fresh
      refetchOnReconnect: true,      // network return → fresh
    },
  },
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Only log errors for user-facing queries (skip background refetches)
      if (query.state.data !== undefined) return;
      const message = error instanceof Error ? error.message : 'An unexpected error occurred';
      console.error(`Query [${query.queryKey.join(',')}] failed:`, error);
      toast.error(message);
    },
  }),
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <HashRouter>
            <AuthInitializer>
              <App />
            </AuthInitializer>
            <Toaster richColors position="top-right" duration={4000} />
          </HashRouter>
        </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
