import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ReturnRequestForm from '../ReturnRequestForm';
import type { Order } from '../../../../types/order';
import type { ReactNode } from 'react';

const returnMock = vi.fn();
vi.mock('../../../../hooks/useMyOrders', () => ({
  useInitiateReturn: () => ({
    mutateAsync: returnMock,
    isPending: false,
  }),
  useCancelOrder: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useMyOrders: () => ({}),
  useMyOrder: () => ({}),
  useRepurchase: () => ({}),
  useDownloadInvoice: () => ({}),
  useOrderTracking: () => ({}),
  useApplyCoupon: () => ({}),
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

const order: Order = {
  id: 'order-1',
  orderNumber: 'RR-2002',
  status: 'DELIVERED',
  paymentStatus: 'PAID',
  subtotal: 2500,
  discountAmount: 0,
  shippingCharge: 0,
  taxAmount: 0,
  totalAmount: 2500,
  channel: 'online',
  items: [
    {
      id: 'oi-1',
      orderId: 'order-1',
      productId: 'prod-1',
      product: { id: 'prod-1', name: 'Kurta Set', basePrice: 1000, images: ['/img.jpg'], slug: 'kurta-set', stock: 5, isFeatured: false, isActive: true, isRentable: false, isSellable: true, sortPriority: 0, categoryId: 'cat-1', variants: [], createdAt: '', updatedAt: '' },
      variant: { id: 'var-1', productId: 'prod-1', size: 'M', color: 'Black', sku: 'SKU-1', isActive: true, images: [], salePrice: 1000 },
      type: 'sale',
      quantity: 2,
      unitPrice: 1000,
      totalPrice: 2000,
    },
    {
      id: 'oi-2',
      orderId: 'order-1',
      productId: 'prod-2',
      product: { id: 'prod-2', name: 'Saree', basePrice: 500, images: ['/img2.jpg'], slug: 'saree', stock: 3, isFeatured: false, isActive: true, isRentable: false, isSellable: true, sortPriority: 0, categoryId: 'cat-2', variants: [], createdAt: '', updatedAt: '' },
      variant: { id: 'var-2', productId: 'prod-2', size: 'Free', color: 'Red', sku: 'SKU-2', isActive: true, images: [], salePrice: 500 },
      type: 'sale',
      quantity: 1,
      unitPrice: 500,
      totalPrice: 500,
    },
  ],
  createdAt: '2026-07-25T10:00:00.000Z',
  updatedAt: '2026-07-25T10:00:00.000Z',
};

describe('ReturnRequestForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    returnMock.mockResolvedValue({ returnRequest: { id: 'rr-1', orderId: 'order-1', status: 'PENDING', createdAt: '' }, items: [] });
  });

  it('renders every order item with a checkbox', () => {
    render(<ReturnRequestForm order={order} onClose={vi.fn()} />, { wrapper: createWrapper() });
    expect(screen.getByText('Kurta Set')).toBeInTheDocument();
    expect(screen.getByText('Saree')).toBeInTheDocument();
  });

  it('submits the per-item DTO {orderItemId, quantity, reason} for each selected item', async () => {
    const user = userEvent.setup();
    const onSubmitted = vi.fn();
    const onClose = vi.fn();
    render(<ReturnRequestForm order={order} onClose={onClose} onSubmitted={onSubmitted} />, {
      wrapper: createWrapper(),
    });

    // Select the first item
    await user.click(screen.getByLabelText('Select Kurta Set for return'));
    // Choose quantity 2 (max) and a reason
    await user.selectOptions(screen.getByLabelText('Quantity to return'), '2');
    await user.selectOptions(screen.getByLabelText('Reason'), 'SIZE_ISSUE');
    await user.type(screen.getByLabelText(/Additional Remarks/i), 'Too small');

    await user.click(screen.getByRole('button', { name: /Submit Return Request/i }));

    await waitFor(() => {
      expect(returnMock).toHaveBeenCalledWith({
        orderId: 'order-1',
        data: {
          items: [
            {
              orderItemId: 'oi-1',
              quantity: 2,
              reason: 'SIZE_ISSUE',
              photos: undefined,
              notes: 'Too small',
            },
          ],
        },
      });
    });
    expect(onSubmitted).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('does not submit when no item is selected and blocks missing reasons', async () => {
    const user = userEvent.setup();
    render(<ReturnRequestForm order={order} onClose={vi.fn()} />, { wrapper: createWrapper() });

    const submit = screen.getByRole('button', { name: /Submit Return Request/i });
    expect(submit).toBeDisabled();

    // Select an item but no reason — validation should block submission
    await user.click(screen.getByLabelText('Select Saree for return'));
    expect(submit).toBeEnabled();
    await user.click(submit);

    await waitFor(() => {
      expect(returnMock).not.toHaveBeenCalled();
    });
  });

  it('limits the quantity selector to the purchased quantity', async () => {
    const user = userEvent.setup();
    render(<ReturnRequestForm order={order} onClose={vi.fn()} />, { wrapper: createWrapper() });
    await user.click(screen.getByLabelText('Select Kurta Set for return'));

    const qty = screen.getByLabelText('Quantity to return') as HTMLSelectElement;
    expect(qty.options).toHaveLength(2); // 1 unit, 2 units (purchased qty)
    expect(qty.options[1].value).toBe('2');
  });
});
