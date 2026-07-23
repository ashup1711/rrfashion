import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MiniCart from '../MiniCart';

const cartState: {
  items: any[];
  total: number;
  removeItem: ReturnType<typeof vi.fn>;
  updateQuantity: ReturnType<typeof vi.fn>;
} = {
  items: [],
  total: 0,
  removeItem: vi.fn(),
  updateQuantity: vi.fn(),
};

vi.mock('../../../store/cartStore', () => ({
  useCartStore: Object.assign(
    (selector?: any) => (selector ? selector(cartState) : cartState),
    {
      getState: () => cartState,
    },
  ),
}));

const uiState: { isMiniCartOpen: boolean; closeMiniCart: ReturnType<typeof vi.fn> } = {
  isMiniCartOpen: false,
  closeMiniCart: vi.fn(),
};

vi.mock('../../../store/uiStore', () => ({
  useUIStore: (selector: any) => selector(uiState),
}));

const renderCart = (open: boolean) => {
  uiState.isMiniCartOpen = open;
  return render(
    <MemoryRouter>
      <MiniCart />
    </MemoryRouter>,
  );
};

describe('MiniCart', () => {
  beforeEach(() => {
    uiState.isMiniCartOpen = false;
    uiState.closeMiniCart.mockClear();
    cartState.items = [];
    cartState.total = 0;
    cartState.removeItem.mockClear();
    cartState.updateQuantity.mockClear();
  });

  it('does not render the dialog when closed', () => {
    renderCart(false);
    expect(screen.queryByRole('dialog', { name: /shopping cart/i })).not.toBeInTheDocument();
  });

  it('renders the dialog with title and close button when open', () => {
    cartState.items = [
      {
        id: 'i1',
        productId: 'p1',
        variantId: 'v1',
        name: 'Banarasi Saree',
        basePrice: 2500,
        salePrice: 2000,
        image: '/images/saree.jpg',
        quantity: 1,
      },
    ];
    cartState.total = 2000;
    renderCart(true);

    expect(screen.getByRole('dialog', { name: /shopping cart/i })).toBeInTheDocument();
    expect(screen.getByText('Your Cart')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /close cart/i })).toBeInTheDocument();
  });

  it('shows cart items, subtotal, and CTAs when populated', () => {
    cartState.items = [
      {
        id: 'i1',
        productId: 'p1',
        variantId: 'v1',
        name: 'Cotton Kurti',
        basePrice: 1500,
        salePrice: 1200,
        image: '/images/kurti.jpg',
        quantity: 2,
      },
    ];
    cartState.total = 2400;
    renderCart(true);

    expect(screen.getByText('Cotton Kurti')).toBeInTheDocument();
    expect(screen.getByText('Subtotal')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view cart/i })).toHaveAttribute('href', '/cart');
    expect(screen.getByRole('link', { name: /checkout/i })).toHaveAttribute('href', '/checkout');
  });

  it('calls closeMiniCart when the close button is clicked', () => {
    cartState.items = [
      {
        id: 'i1',
        productId: 'p1',
        name: 'Item',
        basePrice: 1000,
        image: '',
        quantity: 1,
      },
    ];
    renderCart(true);
    fireEvent.click(screen.getByRole('button', { name: /close cart/i }));
    expect(uiState.closeMiniCart).toHaveBeenCalledTimes(1);
  });
});
