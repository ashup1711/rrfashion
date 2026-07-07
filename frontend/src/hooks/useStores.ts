import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getStores,
  getStore,
  createStore,
  updateStore,
} from '../api/stores';
import { QUERY_KEYS } from '../utils/constants';
import type { CreateStoreData, UpdateStoreData } from '../types/store';

export const useStores = () => {
  return useQuery({
    queryKey: [QUERY_KEYS.stores],
    queryFn: getStores,
    staleTime: 1000 * 60 * 30,
  });
};

export const useStore = (id: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.store, id],
    queryFn: () => getStore(id),
    enabled: !!id,
  });
};

export const useCreateStore = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateStoreData) => createStore(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.stores] });
    },
  });
};

export const useUpdateStore = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateStoreData;
    }) => updateStore(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.stores] });
    },
  });
};
