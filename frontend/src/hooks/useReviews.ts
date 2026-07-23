import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getReviews, createReview, CreateReviewData } from '../api/reviews';
import { toast } from 'sonner';

export const useReviews = (productId?: string) => {
  return useQuery({
    queryKey: ['reviews', productId],
    queryFn: () => getReviews(productId),
    enabled: !!productId,
  });
};

export const useCreateReview = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateReviewData) => createReview(data),
    onSuccess: () => {
      toast.success('Review submitted successfully! It will be visible after admin approval.');
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error?.message || error.message || 'Failed to submit review');
    },
  });
};
