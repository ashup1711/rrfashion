import { adminClient } from './admin-client';
import type { AdminAuthResponse, AdminMeResponse, SwitchTenantResponse } from '../types/admin';
import { setActiveTenantId } from '../utils/tenant';

interface AdminLoginCredentials {
  email: string;
  password: string;
}

export const adminLogin = async (
  credentials: AdminLoginCredentials,
): Promise<AdminAuthResponse> => {
  // Let the server pick a tenant the admin can access instead of a stale stored one.
  setActiveTenantId(null);
  const { data } = await adminClient.post<AdminAuthResponse>(
    '/admin/auth/login',
    credentials,
  );
  return data;
};

export const adminRefresh = async (): Promise<void> => {
  // No body needed — cookies are sent automatically
  await adminClient.post('/admin/auth/refresh');
};

export const adminGetMe = async (): Promise<AdminMeResponse> => {
  const { data } = await adminClient.get<AdminMeResponse>('/admin/auth/me');
  return data;
};

export const adminSwitchTenant = async (tenantId: string): Promise<SwitchTenantResponse> => {
  const { data } = await adminClient.post<SwitchTenantResponse>('/admin/auth/switch-tenant', {
    tenantId,
  });
  return data;
};

export const adminLogout = async (): Promise<void> => {
  // No body needed — the admin_access_token cookie is sent automatically
  // The backend revokes all sessions and clears cookies
  await adminClient.post('/admin/auth/logout');
};
