import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAll, getById, checkAvailability } from '../api/rentals';
import { QUERY_KEYS } from '../utils/constants';
import type { RentalFilters } from '../types/rental';

export const useRentals = (filters?: RentalFilters) => {
  return useQuery({
    queryKey: [QUERY_KEYS.rentals, filters],
    queryFn: () => getAll(filters),
  });
};

export const useRental = (id: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.rental, id],
    queryFn: () => getById(id),
    enabled: !!id,
  });
};

export const useCreateRental = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { variantId: string; startDate: string; endDate: string }) =>
      checkAvailability(data.variantId, data.startDate, data.endDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.rentals] });
    },
  });
};
