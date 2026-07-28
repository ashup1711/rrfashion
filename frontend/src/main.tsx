import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster, toast } from 'sonner';
import App from './App';
import { AuthInitializer } from './components/auth/AuthInitializer';
import ErrorBoundary from './components/common/ErrorBoundary';
import './styles/globals.css';

// Suppress workbox message channel closed error (race condition on navigation)
window.addEventListener('unhandledrejection', (event) => {
  const message = event.reason?.message ?? '';
  if (message.includes('message channel closed before a response was received')) {
    event.preventDefault();
  }
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
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
      <QueryClientProvider client={queryClient}>
        <HashRouter>
          <AuthInitializer>
            <App />
          </AuthInitializer>
          <Toaster richColors position="top-right" duration={4000} />
        </HashRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
