import apiClient from './client';
import adminClient from './admin-client';
import type { PaginatedResponse } from '../types/api';
import type { Inquiry, InquiryFilters } from '../types/inquiry';

export const getAll = async (
  filters?: InquiryFilters,
): Promise<PaginatedResponse<Inquiry>> => {
  const { data } = await adminClient.get<PaginatedResponse<Inquiry>>(
    '/inquiries',
    { params: filters },
  );
  return data;
};

export const getById = async (id: string): Promise<Inquiry> => {
  const { data } = await adminClient.get<Inquiry>(`/inquiries/${id}`);
  return data;
};

export const assign = async (
  id: string,
  adminId: string,
): Promise<Inquiry> => {
  const { data } = await adminClient.patch<Inquiry>(`/inquiries/${id}/assign`, {
    assignedToId: adminId,
  });
  return data;
};

export interface CreateInquiryData {
  name: string;
  email?: string;
  phone?: string;
  message: string;
  productId?: string;
}

export const createInquiry = async (data: CreateInquiryData): Promise<void> => {
  const response = await apiClient.post('/inquiries', data);
  return response.data;
};

export const resolve = async (
  id: string,
  notes: string,
): Promise<Inquiry> => {
  const { data } = await adminClient.patch<Inquiry>(`/inquiries/${id}/resolve`, {
    resolutionNotes: notes,
  });
  return data;
};
