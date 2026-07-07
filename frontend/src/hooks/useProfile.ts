import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProfile, updateProfile } from '../api/profile';
import { useAuthStore } from '../store/authStore';
import { QUERY_KEYS } from '../utils/constants';
import type { UpdateProfileData } from '../api/profile';

export const useProfile = () => {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: [QUERY_KEYS.profile],
    queryFn: getProfile,
    enabled: isAuthenticated,
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateProfileData) => updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.profile] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.me] });
    },
  });
};
