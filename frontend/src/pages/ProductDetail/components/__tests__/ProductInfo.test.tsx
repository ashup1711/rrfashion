import { screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import ProductInfo from '../ProductInfo';
import type { Product } from '../../../../types/product';
import { renderWithProviders } from '../../../../test/test-utils';

// Mock hooks
const mockAddToCart = vi.fn();
const mockAddToWishlist = vi.fn();

vi.mock('../../../hooks/useCart', () => ({
  useCart: () => ({
    addItem: mockAddToCart,
    isAdding: false,
  }),
}));

vi.mock('../../../hooks/useWishlist', () => ({
  useWishlist: () => ({
    addItem: mockAddToWishlist,
    isAdding: false,
  }),
}));

vi.mock('../../../store/authStore', () => ({
  useAuthStore: (selector: any) => selector({ isAuthenticated: true }),
}));

describe('ProductInfo', () => {
  const mockProduct: Product = {
    id: 'prod1',
    name: 'Elegant Kurti',
    slug: 'elegant-kurti',
    basePrice: 2000,
    salePrice: 1500,
    description: 'A beautiful kurti for any occasion.',
    stock: 15,
    isFeatured: false,
    isActive: true,
    isRentable: true,
    isSellable: true,
    sortPriority: 0,
    categoryId: 'cat1',
    category: { id: 'cat1', name: 'Kurti', slug: 'kurti', sortOrder: 1, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    brandId: 'brand1',
    brand: { id: 'brand1', name: 'Premium Brand', isActive: true },
    variants: [
      {
        id: 'var1',
        productId: 'prod1',
        size: 'M',
        color: 'Blue',
        sku: 'VAR-SKU-001',
        isActive: true,
        salePrice: 1500,
        rentPricePerDay: 200,
        securityDeposit: 1000,
        images: [],
      },
      {
        id: 'var2',
        productId: 'prod1',
        size: 'L',
        color: 'Blue',
        sku: 'VAR-SKU-002',
        isActive: true,
        salePrice: 1500,
        rentPricePerDay: 200,
        images: [],
      },
    ],
    images: [],
    fabric: 'Silk',
    careInstructions: 'Dry clean only',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderProductInfo = (product = mockProduct) => {
    return renderWithProviders(
      <BrowserRouter>
        <ProductInfo product={product} />
      </BrowserRouter>
    );
  };

  it('renders product basic information', () => {
    renderProductInfo();
    expect(screen.getByText('Elegant Kurti')).toBeInTheDocument();
    expect(screen.getByText('Premium Brand')).toBeInTheDocument();
    expect(screen.getByText('Kurti')).toBeInTheDocument();
    expect(screen.getByText('₹1,500')).toBeInTheDocument();
    expect(screen.getByText('₹2,000')).toBeInTheDocument(); // Original price
  });

  it('renders sale badge when product is on sale', () => {
    renderProductInfo();
    expect(screen.getByText(/SALE -25%/)).toBeInTheDocument();
  });

  it('handles size selection', () => {
    renderProductInfo();
    const sizeM = screen.getByText('M');
    fireEvent.click(sizeM);
    // After clicking size, color options should be available
    expect(screen.getByText('Blue')).toBeInTheDocument();
  });

  it('handles purchase type toggle (Buy/Rent)', () => {
    renderProductInfo();
    const rentButton = screen.getByText('RENT FOR EVENTS');
    fireEvent.click(rentButton);
    
    // Select size and color to see rent price
    fireEvent.click(screen.getByText('M'));
    fireEvent.click(screen.getByText('Blue'));
    
    expect(screen.getByText(/Rental Price:/)).toBeInTheDocument();
    expect(screen.getByText('₹200')).toBeInTheDocument();
  });

  it('calls addToCart when "Add to Bag" is clicked', () => {
    renderProductInfo();
    
    // Select size and color first
    fireEvent.click(screen.getByText('M'));
    fireEvent.click(screen.getByText('Blue'));
    
    const addToCartButton = screen.getByRole('button', { name: /add to bag/i });
    fireEvent.click(addToCartButton);
    
    expect(mockAddToCart).toHaveBeenCalledWith('var1', 1, 'sale');
  });

  it('renders accordions for additional information', () => {
    renderProductInfo();
    expect(screen.getByText('Product Description')).toBeInTheDocument();
    expect(screen.getByText('Care Instructions')).toBeInTheDocument();
    expect(screen.getByText('Shipping & Returns')).toBeInTheDocument();
  });

  it('toggles accordion content when clicked', () => {
    renderProductInfo();
    const careAccordion = screen.getByText('Care Instructions');
    fireEvent.click(careAccordion);
    
    expect(screen.getByText('Dry clean only')).toBeInTheDocument();
  });
});
