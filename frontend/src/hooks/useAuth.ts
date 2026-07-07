import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  login as loginApi,
  register as registerApi,
  getMe,
  logout as logoutApi,
} from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { QUERY_KEYS } from '../utils/constants';

export const useAuth = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    user,
    isAuthenticated,
    setAuth,
    logout: storeLogout,
  } = useAuthStore();

  // Backend now performs the cart/wishlist migration inside login/register
  // when `guestSessionId` is sent in the body, so the front-end just relies
  // on that and clears the local session after success.

  const loginMutation = useMutation({
    mutationFn: (credentials: Parameters<typeof loginApi>[0]) => loginApi(credentials),
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.me] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.cart] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.wishlist] });
      navigate('/');
    },
  });

  const registerMutation = useMutation({
    mutationFn: (data: Parameters<typeof registerApi>[0]) => registerApi(data),
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.me] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.cart] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.wishlist] });
      navigate('/');
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          await logoutApi(refreshToken);
        } catch {
          // Logout even if API call fails
        }
      }
    },
    onSettled: () => {
      storeLogout();
      queryClient.clear();
      navigate('/auth/login');
    },
  });

  const meQuery = useQuery({
    queryKey: [QUERY_KEYS.me],
    queryFn: getMe,
    enabled: isAuthenticated,
    retry: false,
    staleTime: 1000 * 60 * 2,
  });

  return {
    user: user || meQuery.data,
    isAuthenticated,
    login: loginMutation.mutate,
    loginAsync: loginMutation.mutateAsync,
    register: registerMutation.mutate,
    registerAsync: registerMutation.mutateAsync,
    logout: logoutMutation.mutate,
    isLoading: loginMutation.isPending || registerMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    error: loginMutation.error || registerMutation.error,
  };
};
