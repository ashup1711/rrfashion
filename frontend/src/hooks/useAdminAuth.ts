import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  adminLogin as adminLoginApi,
  adminGetMe,
} from '../api/admin-auth';
import { useAuthStore } from '../store/authStore';
import { useAdminStore } from '../store/adminStore';
import { QUERY_KEYS } from '../utils/constants';

interface AdminLoginCredentials {
  email: string;
  password: string;
}

export const useAdminAuth = () => {
  const navigate = useNavigate();
  const { setAdminAuth, adminLogout, isAdminAuthenticated } = useAuthStore();
  const { setAdminSession, clearAdminSession } = useAdminStore();

  const loginMutation = useMutation({
    mutationFn: (credentials: AdminLoginCredentials) =>
      adminLoginApi(credentials),
    onSuccess: (data) => {
      const adminUser = {
        id: data.admin.id,
        name: data.admin.name,
        email: data.admin.email,
        roleId: data.admin.role.id,
        role: data.admin.role,
        storeIds: data.admin.storeIds ?? [],
        isActive: data.admin.isActive ?? true,
      };
      setAdminAuth(
        adminUser,
        data.admin.permissions,
        data.accessToken,
        data.refreshToken,
      );
      setAdminSession(adminUser, data.admin.permissions);
      navigate('/admin');
    },
  });

  const meQuery = useQuery({
    queryKey: [QUERY_KEYS.adminMe],
    queryFn: adminGetMe,
    enabled: isAdminAuthenticated,
    retry: false,
    staleTime: 1000 * 60 * 2,
  });

  const logout = () => {
    adminLogout();
    clearAdminSession();
    navigate('/admin/login');
  };

  return {
    login: loginMutation.mutate,
    loginAsync: loginMutation.mutateAsync,
    logout,
    isLoading: loginMutation.isPending,
    error: loginMutation.error,
    me: meQuery.data,
    isMeLoading: meQuery.isLoading,
  };
};
