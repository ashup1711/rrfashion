import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
  getPermissions,
  assignPermissions,
} from '../api/roles';
import { QUERY_KEYS } from '../utils/constants';
import type { CreateRoleData, UpdateRoleData } from '../types/roles';

export const useRoles = () => {
  return useQuery({
    queryKey: [QUERY_KEYS.roles],
    queryFn: getRoles,
    staleTime: 1000 * 60 * 5,
  });
};

export const useRole = (id: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.role, id],
    queryFn: () => getRole(id),
    enabled: !!id,
  });
};

export const useCreateRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateRoleData) => createRole(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.roles] });
    },
  });
};

export const useUpdateRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateRoleData;
    }) => updateRole(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.roles] });
    },
  });
};

export const useDeleteRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.roles] });
    },
  });
};

export const usePermissions = () => {
  return useQuery({
    queryKey: [QUERY_KEYS.permissions],
    queryFn: getPermissions,
    staleTime: 1000 * 60 * 30,
  });
};

export const useAssignPermissions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      roleId,
      permissionIds,
    }: {
      roleId: string;
      permissionIds: string[];
    }) => assignPermissions(roleId, permissionIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.roles] });
    },
  });
};
