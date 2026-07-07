import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import App from './App';
import { AuthInitializer } from './components/auth/AuthInitializer';
import './styles/globals.css';
import { ensureGuestSession } from './utils/guestSessionInit';

// Initialize guest session early so the request interceptor
// never needs to make a recursive API call for it.
ensureGuestSession();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <AuthInitializer>
          <App />
        </AuthInitializer>
        <Toaster richColors position="top-right" />
      </HashRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
