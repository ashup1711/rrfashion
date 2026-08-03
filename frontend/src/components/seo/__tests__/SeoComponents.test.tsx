import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProductSeoHead from '../ProductSeoHead';
import JsonLd from '../JsonLd';
import type { Product } from '../../../types/product';

// Mock react-helmet-async
vi.mock('react-helmet-async', () => ({
  Helmet: ({ children }: { children: React.ReactNode }) => <div data-testid="helmet">{children}</div>,
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });

const renderWithHelmet = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
};

const mockProduct: Product = {
  id: 'prod-1',
  name: 'Embroidered Silk Kurta',
  slug: 'embroidered-silk-kurta',
  description: 'Beautiful hand-embroidered silk kurta for women',
  basePrice: 2999,
  salePrice: 2499,
  images: ['uploads/kurta-1.jpg'],
  stock: 15,
  isFeatured: true,
  isActive: true,
  isRentable: false,
  isSellable: true,
  sortPriority: 1,
  categoryId: 'cat-1',
  category: { id: 'cat-1', name: 'Kurtis', slug: 'kurtis', sortOrder: 1, isActive: true, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  brandId: 'brand-1',
  brand: { id: 'brand-1', name: 'RR Fashion', isActive: true },
  variants: [
    {
      id: 'var-1',
      productId: 'prod-1',
      size: 'M',
      color: 'Blue',
      sku: 'SKU-001',
      salePrice: 2499,
      stock: 5,
      isActive: true,
      images: [],
    },
  ],
  createdAt: '2024-01-01',
  updatedAt: '2024-01-15',
};

describe('ProductSeoHead', () => {
  it('renders meta tags for product', () => {
    renderWithHelmet(<ProductSeoHead product={mockProduct} />);
    const helmet = screen.getByTestId('helmet');
    expect(helmet).toBeInTheDocument();
    // Helmet mock renders children which contain <title>, <meta>, etc.
    expect(helmet.textContent).toContain('Embroidered Silk Kurta');
  });

  it('uses metaTitle when available', () => {
    const productWithMeta = { ...mockProduct, metaTitle: 'Custom SEO Title' };
    renderWithHelmet(<ProductSeoHead product={productWithMeta} />);
    const helmet = screen.getByTestId('helmet');
    expect(helmet.textContent).toContain('Custom SEO Title');
  });

  it('falls back to product name for title', () => {
    renderWithHelmet(<ProductSeoHead product={mockProduct} />);
    const helmet = screen.getByTestId('helmet');
    expect(helmet.textContent).toContain('Embroidered Silk Kurta | RR Fashion');
  });
});

describe('JsonLd', () => {
  it('renders a script tag with JSON-LD data', () => {
    const data = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: 'Test Product',
    };
    renderWithHelmet(<JsonLd data={data} />);
    const helmet = screen.getByTestId('helmet');
    expect(helmet.textContent).toContain('schema.org');
    expect(helmet.textContent).toContain('Test Product');
  });

  it('serializes nested objects correctly', () => {
    const data = {
      offers: { '@type': 'Offer', price: 2999, priceCurrency: 'INR' },
    };
    renderWithHelmet(<JsonLd data={data} />);
    const helmet = screen.getByTestId('helmet');
    expect(helmet.textContent).toContain('"price":2999');
  });
});
