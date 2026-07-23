import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import CheckoutForm from '../CheckoutForm';
import * as useAddressesModule from '../../../../hooks/useAddresses';
import * as useCartModule from '../../../../hooks/useCart';
import * as useOrdersModule from '../../../../hooks/useOrders';
import type { ReactNode } from 'react';

// Mock hooks
vi.mock('../../../../hooks/useAddresses', () => ({
  useAddresses: vi.fn(),
}));

vi.mock('../../../../hooks/useCart', () => ({
  useCart: vi.fn(),
}));

vi.mock('../../../../hooks/useOrders', () => ({
  useCreateOrder: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};

describe('CheckoutForm', () => {
  const mockOnStepChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock: useCart returns empty items
    vi.mocked(useCartModule.useCart).mockReturnValue({
      items: [],
      total: 0,
      isLoading: false,
      error: null,
    } as any);
    // Default mock: useCreateOrder returns a mutation object
    vi.mocked(useOrdersModule.useCreateOrder).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);
  });

  it('should show new address form when no saved addresses exist', async () => {
    vi.mocked(useAddressesModule.useAddresses).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    render(<CheckoutForm currentStep={0} onStepChange={mockOnStepChange} />, {
      wrapper: createWrapper(),
    });

    // Wait for useEffect to run
    await vi.waitFor(() => {
      // New address form fields should be visible
      expect(screen.getByPlaceholderText('Enter first name')).toBeDefined();
    });
  });

  it('should show saved address cards when addresses exist', async () => {
    vi.mocked(useAddressesModule.useAddresses).mockReturnValue({
      data: [
        {
          id: 'addr-1',
          label: 'Home',
          line1: '123 Main St',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          phone: '9876543210',
          isDefault: true,
        },
      ],
      isLoading: false,
      error: null,
    } as any);

    render(<CheckoutForm currentStep={0} onStepChange={mockOnStepChange} />, {
      wrapper: createWrapper(),
    });

    await vi.waitFor(() => {
      // Address card should be visible
      expect(screen.getByText('Home')).toBeDefined();
      expect(screen.getByText('123 Main St')).toBeDefined();
    });
  });

  it('should show new address form when addresses API fails', async () => {
    vi.mocked(useAddressesModule.useAddresses).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('API Error'),
    } as any);

    render(<CheckoutForm currentStep={0} onStepChange={mockOnStepChange} />, {
      wrapper: createWrapper(),
    });

    await vi.waitFor(() => {
      // New address form should be visible (fallback)
      expect(screen.getByPlaceholderText('Enter first name')).toBeDefined();
    });

    // toast.error should have been called
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining('Unable to load saved addresses'),
      expect.any(Object),
    );
  });

  it('should show loading state while addresses are loading', () => {
    vi.mocked(useAddressesModule.useAddresses).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);

    const { container } = render(
      <CheckoutForm currentStep={0} onStepChange={mockOnStepChange} />,
      { wrapper: createWrapper() },
    );

    // Skeleton loading should be visible
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
