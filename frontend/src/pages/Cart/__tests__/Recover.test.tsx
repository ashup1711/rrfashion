import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Recover from '../Recover';
import * as cartApi from '../../../api/cart';
import type { ReactNode } from 'react';

const setCartIdMock = vi.fn();
vi.mock('../../../api/cart', () => ({
  recover: vi.fn(),
  getCart: vi.fn(),
  addCartItem: vi.fn(),
  updateCartItem: vi.fn(),
  removeFromCart: vi.fn(),
}));

vi.mock('../../../store/cartStore', () => ({
  useCartStore: { getState: () => ({ setCartId: setCartIdMock }) },
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('Recover', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a loading state while recovering', () => {
    vi.mocked(cartApi.recover).mockReturnValue(new Promise(() => {}));
    render(
      <MemoryRouter initialEntries={['/cart/recover/token123']}>
        <Routes>
          <Route path="/cart/recover/:token" element={<Recover />} />
        </Routes>
      </MemoryRouter>,
      { wrapper: createWrapper() },
    );
    expect(screen.getByText(/Restoring your cart/)).toBeInTheDocument();
  });

  it('persists the restored cart id and redirects to /cart on success', async () => {
    vi.mocked(cartApi.recover).mockResolvedValue({ cart: { id: 'cart-42', items: [], total: 0 }, items: [], recoveredAt: '2026-08-02T10:00:00.000Z' });

    render(
      <MemoryRouter initialEntries={['/cart/recover/token123']}>
        <Routes>
          <Route path="/cart/recover/:token" element={<Recover />} />
          <Route path="/cart" element={<div>Cart Page</div>} />
        </Routes>
      </MemoryRouter>,
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(cartApi.recover).toHaveBeenCalledWith('token123'));
    await waitFor(() => expect(setCartIdMock).toHaveBeenCalledWith('cart-42'));
    expect(await screen.findByText('Cart Page')).toBeInTheDocument();
  });

  it('shows a friendly error and action buttons when recovery fails', async () => {
    vi.mocked(cartApi.recover).mockRejectedValue(new Error('This recovery link is invalid or has expired.'));

    render(
      <MemoryRouter initialEntries={['/cart/recover/badtoken']}>
        <Routes>
          <Route path="/cart/recover/:token" element={<Recover />} />
          <Route path="/cart" element={<div>Cart Page</div>} />
        </Routes>
      </MemoryRouter>,
      { wrapper: createWrapper() },
    );

    expect(await screen.findByText('Cart Recovery Unavailable')).toBeInTheDocument();
    expect(screen.getByText(/This recovery link is invalid or has expired/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Go to Cart/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continue Shopping/i })).toBeInTheDocument();
    expect(setCartIdMock).not.toHaveBeenCalled();
  });

  it('handles a missing token by showing the error state', async () => {
    // Render without a matching :token route so useParams returns an empty object.
    render(
      <MemoryRouter initialEntries={['/cart/recover']}>
        <Recover />
      </MemoryRouter>,
      { wrapper: createWrapper() },
    );

    expect(await screen.findByText('Cart Recovery Unavailable')).toBeInTheDocument();
    expect(screen.getByText(/missing its token/)).toBeInTheDocument();
    expect(cartApi.recover).not.toHaveBeenCalled();
  });
});
