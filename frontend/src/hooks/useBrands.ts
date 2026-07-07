import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getBrands,
  getBrand,
  createBrand,
  updateBrand,
  deleteBrand,
} from '../api/brands';
import { QUERY_KEYS } from '../utils/constants';
import type { CreateBrandData, UpdateBrandData } from '../types/brand';

export const useBrands = () => {
  return useQuery({
    queryKey: [QUERY_KEYS.brands],
    queryFn: getBrands,
    staleTime: 1000 * 60 * 30,
  });
};

export const useBrand = (id: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.brand, id],
    queryFn: () => getBrand(id),
    enabled: !!id,
  });
};

export const useCreateBrand = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBrandData) => createBrand(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.brands] });
    },
  });
};

export const useUpdateBrand = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateBrandData;
    }) => updateBrand(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.brands] });
    },
  });
};

export const useDeleteBrand = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteBrand(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.brands] });
    },
  });
};
