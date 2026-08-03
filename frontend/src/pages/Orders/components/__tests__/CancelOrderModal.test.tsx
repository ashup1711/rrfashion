import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CancelOrderModal from '../CancelOrderModal';
import type { Order } from '../../../../types/order';
import type { ReactNode } from 'react';

// Mock the cancel mutation hook
const cancelMock = vi.fn();
vi.mock('../../../../hooks/useMyOrders', () => ({
  useCancelOrder: () => ({
    mutateAsync: cancelMock,
    isPending: false,
    isError: false,
  }),
  useMyOrders: () => ({}),
  useMyOrder: () => ({}),
  useRepurchase: () => ({}),
  useDownloadInvoice: () => ({}),
  useInitiateReturn: () => ({}),
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

const baseOrder: Order = {
  id: 'order-1',
  orderNumber: 'RR-1001',
  status: 'CONFIRMED',
  paymentStatus: 'PAID',
  subtotal: 2000,
  discountAmount: 0,
  shippingCharge: 0,
  taxAmount: 100,
  totalAmount: 2100,
  channel: 'online',
  items: [],
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-01T10:00:00.000Z',
};

describe('CancelOrderModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cancelMock.mockResolvedValue({ id: 'order-1', status: 'CANCELLED', refundId: 'ref-1', cancelledAt: '2026-08-02T10:00:00.000Z' });
  });

  it('renders the order number and a refund estimate when paymentStatus is PAID', () => {
    render(
      <CancelOrderModal isOpen onClose={vi.fn()} order={baseOrder} />,
      { wrapper: createWrapper() },
    );
    expect(screen.getByText(/RR-1001/)).toBeInTheDocument();
    expect(screen.getByText(/Refund estimate:/)).toBeInTheDocument();
    expect(screen.getByText('₹2,100.00')).toBeInTheDocument();
  });

  it('does not show a refund estimate when the order is unpaid', () => {
    render(
      <CancelOrderModal
        isOpen
        onClose={vi.fn()}
        order={{ ...baseOrder, paymentStatus: 'PENDING' }}
      />,
      { wrapper: createWrapper() },
    );
    expect(screen.queryByText(/Refund estimate:/)).not.toBeInTheDocument();
  });

  it('disables submit until a reason is selected, then calls cancel with reason + notes', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onCancelled = vi.fn();
    render(
      <CancelOrderModal isOpen onClose={onClose} order={baseOrder} onCancelled={onCancelled} />,
      { wrapper: createWrapper() },
    );

    const submit = screen.getByRole('button', { name: /Cancel Order$/i });
    expect(submit).toBeDisabled();

    await user.selectOptions(screen.getByLabelText(/Reason for cancellation/i), 'OTHER');
    await user.type(screen.getByLabelText(/Additional Notes/i), 'Changed mind');
    expect(submit).toBeEnabled();

    await user.click(submit);
    await waitFor(() => {
      expect(cancelMock).toHaveBeenCalledWith({
        id: 'order-1',
        reason: 'OTHER',
        notes: 'Changed mind',
      });
    });
    expect(onCancelled).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('calls keep-order button to close without cancelling', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<CancelOrderModal isOpen onClose={onClose} order={baseOrder} />, {
      wrapper: createWrapper(),
    });
    await user.click(screen.getByRole('button', { name: /Keep Order/i }));
    expect(onClose).toHaveBeenCalled();
    expect(cancelMock).not.toHaveBeenCalled();
  });
});
