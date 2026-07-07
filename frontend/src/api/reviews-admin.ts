import apiClient from './client';
import adminClient from './admin-client';
import type { PaginatedResponse, PaginationParams } from '../types/api';

export interface AdminReview {
  id: string;
  rating: number;
  comment: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  product: {
    id: string;
    name: string;
    image?: string;
  };
}

export interface ReviewFilters extends PaginationParams {
  status?: string;
  rating?: number;
  productId?: string;
}

export interface ModerateReviewData {
  status: 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
}

export interface ModerateReviewResponse {
  id: string;
  status: 'APPROVED' | 'REJECTED';
}

export const getAll = async (
  filters?: ReviewFilters,
): Promise<PaginatedResponse<AdminReview>> => {
  const { data } = await adminClient.get<PaginatedResponse<AdminReview>>(
    '/admin/reviews',
    { params: filters },
  );
  return data;
};

export const moderate = async (
  id: string,
  moderateData: ModerateReviewData,
): Promise<ModerateReviewResponse> => {
  const { data } = await adminClient.patch<ModerateReviewResponse>(
    `/admin/reviews/${id}/moderate`,
    moderateData,
  );
  return data;
};
