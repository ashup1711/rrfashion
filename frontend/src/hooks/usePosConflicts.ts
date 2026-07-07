import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getConflicts, resolveConflict } from '../api/pos';
import { QUERY_KEYS } from '../utils/constants';

export const usePosConflicts = (params?: { storeId?: string; status?: string }) => {
  return useQuery({
    queryKey: [QUERY_KEYS.posConflicts, params],
    queryFn: () => getConflicts(params),
  });
};

export const useResolveConflict = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => resolveConflict(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.posConflicts] });
    },
  });
};
