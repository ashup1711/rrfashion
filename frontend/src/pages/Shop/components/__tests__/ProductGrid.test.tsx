import { screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ProductGrid from '../ProductGrid';
import { useInfiniteProducts } from '../../../../hooks/useProducts';
import { BrowserRouter } from 'react-router-dom';
import { renderWithProviders } from '../../../../test/test-utils';

vi.mock('../../../../hooks/useProducts', () => ({
  useInfiniteProducts: vi.fn(),
}));

const mockProducts = [
  { id: '1', name: 'Product 1', basePrice: 100, images: [], variants: [] },
  { id: '2', name: 'Product 2', basePrice: 200, images: [], variants: [] },
];

describe('ProductGrid', () => {
  it('renders products and handles load more', () => {
    (useInfiniteProducts as any).mockReturnValue({
      data: {
        pages: [
          {
            items: mockProducts,
            meta: { total: 10, page: 1, totalPages: 5 },
          },
        ],
      },
      isLoading: false,
      error: null,
      hasNextPage: true,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false,
    });

    renderWithProviders(
      <BrowserRouter>
        <ProductGrid />
      </BrowserRouter>
    );

    expect(screen.getByText(/Showing 2 of 10 products/i)).toBeInTheDocument();
    expect(screen.getByText('Product 1')).toBeInTheDocument();
    expect(screen.getByText('Product 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /load more products/i })).toBeInTheDocument();
  });

  it('renders empty state when no products', () => {
    (useInfiniteProducts as any).mockReturnValue({
      data: {
        pages: [
          {
            items: [],
            meta: { total: 0, page: 1, totalPages: 0 },
          },
        ],
      },
      isLoading: false,
      error: null,
      hasNextPage: false,
    });

    renderWithProviders(
      <BrowserRouter>
        <ProductGrid />
      </BrowserRouter>
    );

    expect(screen.getByText(/no products found/i)).toBeInTheDocument();
  });
});
