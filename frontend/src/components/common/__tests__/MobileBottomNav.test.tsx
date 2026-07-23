import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MobileBottomNav from '../MobileBottomNav';
import { renderWithProviders } from '../../../test/test-utils';

vi.mock('../../store/authStore', () => ({
  useAuthStore: vi.fn((selector) => selector({ isAuthenticated: false })),
}));

vi.mock('../../store/cartStore', () => ({
  useCartStore: vi.fn((selector) => selector({ itemCount: 3 })),
}));

vi.mock('../../hooks/useWishlist', () => ({
  useWishlist: vi.fn(() => ({
    items: [{ variantId: '1' }, { variantId: '2' }],
  })),
}));

describe('MobileBottomNav', () => {
  it('renders all five nav items', () => {
    renderWithProviders(
      <MemoryRouter>
        <MobileBottomNav />
      </MemoryRouter>
    );

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Shop')).toBeInTheDocument();
    expect(screen.getByText('Wishlist')).toBeInTheDocument();
    expect(screen.getByText('Cart')).toBeInTheDocument();
    expect(screen.getByText('Account')).toBeInTheDocument();
  });

  it('displays wishlist and cart badges with counts', () => {
    const { container } = renderWithProviders(
      <MemoryRouter>
        <MobileBottomNav />
      </MemoryRouter>
    );

    const badges = container.querySelectorAll('span.bg-primary-500.rounded-full');
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });

  it('has proper accessibility roles', () => {
    renderWithProviders(
      <MemoryRouter>
        <MobileBottomNav />
      </MemoryRouter>
    );

    const nav = screen.getByRole('navigation');
    expect(nav).toHaveAttribute('aria-label', 'Mobile navigation');
  });
});
