import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getSizes,
  getSize,
  createSize,
  updateSize,
  deleteSize,
} from '../api/sizes';
import { QUERY_KEYS } from '../utils/constants';
import type { CreateSizeData, UpdateSizeData } from '../types/size';

export const useSizes = () => {
  return useQuery({
    queryKey: [QUERY_KEYS.sizes],
    queryFn: getSizes,
    staleTime: 1000 * 60 * 30,
  });
};

export const useSize = (id: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.size, id],
    queryFn: () => getSize(id),
    enabled: !!id,
  });
};

export const useCreateSize = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSizeData) => createSize(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.sizes] });
    },
  });
};

export const useUpdateSize = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateSizeData;
    }) => updateSize(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.sizes] });
    },
  });
};

export const useDeleteSize = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteSize(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.sizes] });
    },
  });
};
