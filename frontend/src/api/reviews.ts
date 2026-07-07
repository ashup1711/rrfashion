import apiClient from './client';

export interface Review {
  id: string;
  userId: string;
  productId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface CreateReviewData {
  productId: string;
  rating: number;
  comment: string;
}

export const getReviews = async (productId?: string): Promise<Review[]> => {
  const params = productId ? { productId } : {};
  const { data } = await apiClient.get<Review[]>('/reviews', { params });
  return data;
};

export const createReview = async (reviewData: CreateReviewData): Promise<Review> => {
  const { data } = await apiClient.post<Review>('/reviews', reviewData);
  return data;
};
