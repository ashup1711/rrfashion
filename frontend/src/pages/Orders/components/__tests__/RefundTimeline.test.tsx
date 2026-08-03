import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RefundTimeline from '../RefundTimeline';
import type { ReactNode } from 'react';

const refundQueryMock = vi.fn();
vi.mock('../../../../hooks/useRefundTimeline', () => ({
  useRefundTimeline: () => refundQueryMock(),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('RefundTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders INITIATED → PROCESSED steps with amounts and timestamps', () => {
    refundQueryMock.mockReturnValue({
      data: {
        refunds: [
          {
            id: 'r1',
            orderId: 'order-1',
            amount: 1200,
            status: 'INITIATED',
            initiatedAt: '2026-08-01T10:00:00.000Z',
            processedAt: null,
          },
          {
            id: 'r2',
            orderId: 'order-1',
            amount: 800,
            status: 'PROCESSED',
            initiatedAt: '2026-08-01T10:05:00.000Z',
            processedAt: '2026-08-01T14:00:00.000Z',
          },
        ],
      },
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<RefundTimeline orderId="order-1" />, { wrapper: createWrapper() });

    expect(screen.getByText('Refund Initiated')).toBeInTheDocument();
    expect(screen.getByText('Refund Processed')).toBeInTheDocument();
    expect(screen.getByText('₹1,200.00')).toBeInTheDocument();
    expect(screen.getByText('₹800.00')).toBeInTheDocument();
    expect(screen.getByText(/Processed at/)).toBeInTheDocument();
  });

  it('renders a FAILED refund with a support hint', () => {
    refundQueryMock.mockReturnValue({
      data: {
        refunds: [
          {
            id: 'r3',
            orderId: 'order-1',
            amount: 500,
            status: 'FAILED',
            initiatedAt: '2026-08-01T10:00:00.000Z',
            processedAt: '2026-08-01T11:00:00.000Z',
          },
        ],
      },
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<RefundTimeline orderId="order-1" />, { wrapper: createWrapper() });

    expect(screen.getByText('Refund Failed')).toBeInTheDocument();
    expect(screen.getByText(/could not be completed/)).toBeInTheDocument();
  });

  it('renders nothing when the order has no refunds', () => {
    refundQueryMock.mockReturnValue({
      data: { refunds: [] },
      isLoading: false,
      isError: false,
      error: null,
    });

    const { container } = render(<RefundTimeline orderId="order-1" />, {
      wrapper: createWrapper(),
    });
    expect(container.firstChild).toBeNull();
  });

  it('renders an error state when the refund query fails', () => {
    refundQueryMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Network error'),
    });

    render(<RefundTimeline orderId="order-1" />, { wrapper: createWrapper() });

    expect(screen.getByText(/Unable to load refund status/)).toBeInTheDocument();
  });

  it('shows a loading spinner while the query is pending', () => {
    refundQueryMock.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    });

    render(<RefundTimeline orderId="order-1" />, { wrapper: createWrapper() });

    expect(screen.getByText('Loading refund status...')).toBeInTheDocument();
  });
});
