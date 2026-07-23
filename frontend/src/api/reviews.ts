import apiClient from './client';

export interface Review {
  id: string;
  userId?: string;
  productId: string;
  orderItemId?: string;
  rating: number;
  comment: string;
  photos?: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'FLAGGED';
  createdAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    profilePhoto?: string;
  };
}

export interface CreateReviewData {
  productId: string;
  rating: number;
  comment: string;
  photos?: string[];
}

export interface ReviewsResponse {
  items: Review[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const getReviews = async (productId?: string, page = 1, limit = 20): Promise<ReviewsResponse> => {
  const params: Record<string, any> = { page, limit };
  if (productId) {
    params.productId = productId;
  }
  const { data } = await apiClient.get<ReviewsResponse>('/reviews', { params });
  return data;
};

export const createReview = async (reviewData: CreateReviewData): Promise<Review> => {
  const { data } = await apiClient.post<Review>('/reviews', reviewData);
  return data;
};
