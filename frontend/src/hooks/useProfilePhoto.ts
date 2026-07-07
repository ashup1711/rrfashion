import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadProfilePhoto } from '../api/profile';
import { QUERY_KEYS } from '../utils/constants';

export const useProfilePhoto = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadProfilePhoto(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.profile] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.me] });
    },
  });
};
