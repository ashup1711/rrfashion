import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getColors,
  getColor,
  createColor,
  updateColor,
  deleteColor,
} from '../api/colors';
import { QUERY_KEYS } from '../utils/constants';
import type { CreateColorData, UpdateColorData } from '../types/color';

export const useColors = () => {
  return useQuery({
    queryKey: [QUERY_KEYS.colors],
    queryFn: getColors,
    staleTime: 1000 * 60 * 30,
  });
};

export const useColor = (id: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.color, id],
    queryFn: () => getColor(id),
    enabled: !!id,
  });
};

export const useCreateColor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateColorData) => createColor(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.colors] });
    },
  });
};

export const useUpdateColor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateColorData;
    }) => updateColor(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.colors] });
    },
  });
};

export const useDeleteColor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteColor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.colors] });
    },
  });
};
