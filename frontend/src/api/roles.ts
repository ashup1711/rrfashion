import adminClient from './admin-client';
import type { Role, CreateRoleData, UpdateRoleData, Permission } from '../types/roles';

export const getRoles = async (): Promise<Role[]> => {
  const { data } = await adminClient.get<Role[]>('/admin/roles');
  return data;
};

export const getRole = async (id: string): Promise<Role> => {
  const { data } = await adminClient.get<Role>(`/admin/roles/${id}`);
  return data;
};

export const createRole = async (roleData: CreateRoleData): Promise<Role> => {
  const { data } = await adminClient.post<Role>('/admin/roles', roleData);
  return data;
};

export const updateRole = async (
  id: string,
  roleData: UpdateRoleData,
): Promise<Role> => {
  const { data } = await adminClient.patch<Role>(
    `/admin/roles/${id}`,
    roleData,
  );
  return data;
};

export const deleteRole = async (id: string): Promise<{ message: string }> => {
  const { data } = await adminClient.delete<{ message: string }>(
    `/admin/roles/${id}`,
  );
  return data;
};

export const getPermissions = async (): Promise<Permission[]> => {
  const { data } = await adminClient.get<Permission[]>('/admin/permissions');
  return data;
};

export const assignPermissions = async (
  roleId: string,
  permissionIds: string[],
): Promise<Role> => {
  const { data } = await adminClient.post<Role>(
    `/admin/roles/${roleId}/permissions`,
    { permissionIds },
  );
  return data;
};
