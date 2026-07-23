import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAddresses } from '../useAddresses';
import * as addressesApi from '../../api/addresses';
import type { ReactNode } from 'react';

vi.mock('../../api/addresses', () => ({
  getAddresses: vi.fn(),
  createAddress: vi.fn(),
  updateAddress: vi.fn(),
  deleteAddress: vi.fn(),
  setDefaultAddress: vi.fn(),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useAddresses', () => {
  it('should return addresses on success', async () => {
    const mockAddresses = [
      {
        id: 'addr-1',
        userId: 'user-1',
        label: 'Home',
        line1: '123 Main St',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        phone: '9876543210',
        isDefault: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ];
    vi.mocked(addressesApi.getAddresses).mockResolvedValue(mockAddresses);

    const { result } = renderHook(() => useAddresses(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual(mockAddresses);
    expect(result.current.error).toBeNull();
  });

  it('should set error on API failure', async () => {
    vi.mocked(addressesApi.getAddresses).mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() => useAddresses(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeDefined();
  });
});
