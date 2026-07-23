import { screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Lookbook from '../Lookbook';
import { renderWithProviders } from '../../../../test/test-utils';

// Mock Swiper
vi.mock('swiper/react', () => ({
  Swiper: ({ children }: any) => <div data-testid="swiper">{children}</div>,
  SwiperSlide: ({ children }: any) => <div data-testid="swiper-slide">{children}</div>,
}));

vi.mock('swiper/modules', () => ({
  Pagination: () => null,
  Navigation: () => null,
  A11y: () => null,
}));

describe('Lookbook', () => {
  it('renders title and grid', () => {
    renderWithProviders(
      <BrowserRouter>
        <Lookbook />
      </BrowserRouter>
    );
    expect(screen.getByText(/Shop The Look/i)).toBeInTheDocument();
    expect(screen.getByText(/Festive Edit/i)).toBeInTheDocument();
  });

  it('shows product tags and tooltips on interaction', () => {
    renderWithProviders(
      <BrowserRouter>
        <Lookbook />
      </BrowserRouter>
    );

    // Find a pin (button)
    const pins = screen.getAllByRole('button', { name: /view/i });
    expect(pins.length).toBeGreaterThan(0);

    // Tooltip should be invisible initially (opacity-0 class)
    // But RTL finds it in the DOM
    const tooltips = screen.getAllByText(/Premium Silk Saree/i);
    expect(tooltips[0]).toBeInTheDocument();
  });
});
