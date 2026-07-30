import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminOrdersList from '../index';

vi.mock('../../../../hooks/useAdminOrders', () => ({
  useAdminOrders: () => ({
    data: { items: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } },
    isLoading: false,
  }),
  useUpdateOrderStatus: () => ({ mutateAsync: vi.fn() }),
  useUpdateOrderPaymentStatus: () => ({ mutateAsync: vi.fn() }),
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>
  );

describe('AdminOrdersList', () => {
  it('renders the orders list heading', () => {
    renderWithProviders(<AdminOrdersList />);
    expect(screen.getByText('Orders')).toBeTruthy();
  });
});
