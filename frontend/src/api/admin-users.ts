import apiClient from './client';
import adminClient from './admin-client';
import type {
  AdminUser,
  CreateAdminUserData,
  UpdateAdminUserData,
} from '../types/admin';
import type { PaginatedResponse } from '../types/api';

interface AdminUsersQuery {
  page?: number;
  limit?: number;
  roleId?: string;
  search?: string;
}

export const getAdminUsers = async (
  params?: AdminUsersQuery,
): Promise<PaginatedResponse<AdminUser>> => {
  const { data } = await adminClient.get<PaginatedResponse<AdminUser>>(
    '/admin/users',
    { params },
  );
  return data;
};

export const getAdminUser = async (id: string): Promise<AdminUser> => {
  const { data } = await adminClient.get<AdminUser>(`/admin/users/${id}`);
  return data;
};

export const createAdminUser = async (
  userData: CreateAdminUserData,
): Promise<AdminUser> => {
  const { data } = await adminClient.post<AdminUser>('/admin/users', userData);
  return data;
};

export const updateAdminUser = async (
  id: string,
  userData: UpdateAdminUserData,
): Promise<AdminUser> => {
  const { data } = await adminClient.patch<AdminUser>(
    `/admin/users/${id}`,
    userData,
  );
  return data;
};

export const deleteAdminUser = async (
  id: string,
): Promise<{ message: string }> => {
  const { data } = await adminClient.delete<{ message: string }>(
    `/admin/users/${id}`,
  );
  return data;
};
