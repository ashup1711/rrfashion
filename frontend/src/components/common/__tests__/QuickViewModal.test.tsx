import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import QuickViewModal from '../QuickViewModal';

const product = {
  id: 'p1',
  name: 'Cotton Kurti',
  slug: 'cotton-kurti',
  basePrice: 1000,
  salePrice: 800,
  images: ['/img.jpg'],
  stock: 5,
  isActive: true,
  isFeatured: false,
  isRentable: false,
  isSellable: true,
  categoryId: 'c1',
  sortPriority: 0,
  variants: [
    { id: 'v1', productId: 'p1', size: 'M', color: 'Red', sku: 's1', isActive: true, images: [] },
  ],
  createdAt: '',
  updatedAt: '',
};

const uiState = {
  isQuickViewOpen: false,
  quickViewProduct: null as any,
  closeQuickView: vi.fn(),
  openMiniCart: vi.fn(),
};

vi.mock('../../../store/uiStore', () => ({
  useUIStore: (selector?: any) => (selector ? selector(uiState) : uiState),
}));

const cartState = {
  addItem: vi.fn(),
};

vi.mock('../../../store/cartStore', () => ({
  useCartStore: Object.assign((selector?: any) => (selector ? selector(cartState) : cartState), {
    getState: () => cartState,
  }),
}));

const { toastMock } = vi.hoisted(() => ({
  toastMock: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('sonner', () => ({
  toast: toastMock,
}));

const renderModal = () => {
  uiState.isQuickViewOpen = true;
  uiState.quickViewProduct = product;
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<QuickViewModal />} />
        <Route path="/checkout" element={<div>Checkout Page</div>} />
      </Routes>
    </MemoryRouter>,
  );
};

describe('QuickViewModal - Buy It Now', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    uiState.closeQuickView.mockClear();
    uiState.openMiniCart.mockClear();
    cartState.addItem.mockClear();
    toastMock.error.mockClear();
    toastMock.success.mockClear();
  });

  it('renders the BUY IT NOW button', async () => {
    renderModal();
    expect(await screen.findByRole('button', { name: /buy it now/i })).toBeInTheDocument();
  });

  it('shows an error toast when Buy It Now is clicked without selecting a size', async () => {
    renderModal();
    const buyBtn = await screen.findByRole('button', { name: /buy it now/i });
    fireEvent.click(buyBtn);

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith('Please select a size');
    });
    expect(cartState.addItem).not.toHaveBeenCalled();
    expect(screen.queryByText('Checkout Page')).not.toBeInTheDocument();
  });

  it('adds the item to cart and navigates to checkout when Buy It Now is clicked with a size', async () => {
    renderModal();
    const sizeBtn = await screen.findByRole('button', { name: 'M' });
    fireEvent.click(sizeBtn);

    const buyBtn = screen.getByRole('button', { name: /buy it now/i });
    fireEvent.click(buyBtn);

    await waitFor(() => {
      expect(cartState.addItem).toHaveBeenCalledTimes(1);
    });

    expect(cartState.addItem).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 'p1',
        variantId: 'v1',
        name: 'Cotton Kurti',
        type: 'sale',
      }),
    );
    expect(uiState.closeQuickView).toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.getByText('Checkout Page')).toBeInTheDocument();
    });
  });
});
