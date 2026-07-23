import { screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import RecentlyViewed from '../RecentlyViewed';
import { renderWithProviders } from '../../../test/test-utils';

// Mock Swiper
vi.mock('swiper/react', () => ({
  Swiper: ({ children }: any) => <div data-testid="swiper">{children}</div>,
  SwiperSlide: ({ children }: any) => <div data-testid="swiper-slide">{children}</div>,
}));

vi.mock('swiper/modules', () => ({
  Navigation: () => null,
  A11y: () => null,
}));

const mockProduct = {
  id: 'p1',
  name: 'Test Product',
  basePrice: 100,
  images: ['img1.jpg'],
  variants: [{ id: 'v1', isActive: true }]
};

describe('RecentlyViewed', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders nothing when empty', () => {
    const { container } = renderWithProviders(<RecentlyViewed />);
    expect(container.firstChild).toBeNull();
  });

  it('renders products from local storage', () => {
    localStorage.setItem('rr_recently_viewed', JSON.stringify([mockProduct]));

    renderWithProviders(
      <BrowserRouter>
        <RecentlyViewed />
      </BrowserRouter>
    );

    expect(screen.getByText(/Recently Viewed/i)).toBeInTheDocument();
    expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
  });
});
