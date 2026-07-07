import apiClient from './client';
import adminClient from './admin-client';
import type { PaginatedResponse } from '../types/api';
import type { RentalBooking, RentalFilters, CheckAvailabilityResponse } from '../types/rental';

export const getAll = async (
  filters?: RentalFilters,
): Promise<PaginatedResponse<RentalBooking>> => {
  const { data } = await adminClient.get<PaginatedResponse<RentalBooking>>(
    '/admin/rentals',
    { params: filters },
  );
  return data;
};

export const getById = async (id: string): Promise<RentalBooking> => {
  const { data } = await adminClient.get<RentalBooking>(`/admin/rentals/${id}`);
  return data;
};

export const checkAvailability = async (
  variantId: string,
  startDate: string,
  endDate: string,
): Promise<CheckAvailabilityResponse> => {
  const { data } = await apiClient.post<CheckAvailabilityResponse>(
    '/rentals/check-availability',
    { variantId, startDate, endDate },
  );
  return data;
};

// P1-001: Deposit pre-auth
export const createDeposit = async (rentalId: string, amount: number): Promise<{ razorpayPreAuthId: string; amount: number; status: string }> => {
  const { data } = await apiClient.post(`/rentals/${rentalId}/create-deposit`, { amount });
  return data;
};

export const captureDeposit = async (rentalId: string, razorpayPreAuthId: string, amount?: number): Promise<{ status: string }> => {
  const { data } = await apiClient.post(`/rentals/${rentalId}/capture-deposit`, { razorpayPreAuthId, amount });
  return data;
};

export const releaseDeposit = async (rentalId: string, razorpayPreAuthId: string): Promise<{ status: string }> => {
  const { data } = await apiClient.post(`/rentals/${rentalId}/release-deposit`, { razorpayPreAuthId });
  return data;
};
