import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Checkout from '../index';
import * as useAuthStoreModule from '../../../store/authStore';
import * as useCartModule from '../../../hooks/useCart';
import type { ReactNode } from 'react';

vi.mock('../../../store/authStore', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('../../../hooks/useCart', () => ({
  useCart: vi.fn(),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/checkout']}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Checkout ErrorBoundary', () => {
  it('should show error fallback when a render error occurs in any branch', () => {
    // Force a render error by making isAuthenticated throw
    vi.mocked(useAuthStoreModule.useAuthStore).mockImplementation(() => {
      throw new Error('Simulated render error');
    });

    render(<Checkout />, { wrapper: createWrapper() });

    // ErrorBoundary should catch the error and show fallback UI
    expect(screen.getByText(/something went wrong/i)).toBeDefined();
    expect(screen.getByText(/refresh page/i)).toBeDefined();
  });
});
