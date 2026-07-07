import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAdminUsers,
  getAdminUser,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
} from '../api/admin-users';
import { QUERY_KEYS } from '../utils/constants';
import type { CreateAdminUserData, UpdateAdminUserData } from '../types/admin';

interface AdminUsersFilters {
  page?: number;
  limit?: number;
  roleId?: string;
  search?: string;
}

export const useAdminUsers = (filters?: AdminUsersFilters) => {
  return useQuery({
    queryKey: [QUERY_KEYS.adminUsers, filters],
    queryFn: () => getAdminUsers(filters),
  });
};

export const useAdminUser = (id: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.adminUser, id],
    queryFn: () => getAdminUser(id),
    enabled: !!id,
  });
};

export const useCreateAdminUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAdminUserData) => createAdminUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.adminUsers] });
    },
  });
};

export const useUpdateAdminUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateAdminUserData;
    }) => updateAdminUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.adminUsers] });
    },
  });
};

export const useDeleteAdminUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteAdminUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.adminUsers] });
    },
  });
};
