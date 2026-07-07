import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAll,
  moderate,
} from '../api/reviews-admin';
import { QUERY_KEYS } from '../utils/constants';
import type { ReviewFilters, ModerateReviewData } from '../api/reviews-admin';

export const useAdminReviews = (filters?: ReviewFilters) => {
  return useQuery({
    queryKey: [QUERY_KEYS.adminReviews, filters],
    queryFn: () => getAll(filters),
  });
};

export const useModerateReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: ModerateReviewData;
    }) => moderate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.adminReviews],
      });
    },
  });
};
