import { adminClient } from './admin-client';
import type { AdminAuthResponse, AdminMeResponse } from '../types/admin';

interface AdminLoginCredentials {
  email: string;
  password: string;
}

export const adminLogin = async (
  credentials: AdminLoginCredentials,
): Promise<AdminAuthResponse> => {
  const { data } = await adminClient.post<AdminAuthResponse>(
    '/admin/auth/login',
    credentials,
  );
  return data;
};

export const adminRefresh = async (
  refreshTokenValue: string,
): Promise<{ accessToken: string; refreshToken: string }> => {
  const { data } = await adminClient.post<{
    accessToken: string;
    refreshToken: string;
  }>('/admin/auth/refresh', { refreshToken: refreshTokenValue });
  return data;
};

export const adminGetMe = async (): Promise<AdminMeResponse> => {
  const { data } = await adminClient.get<AdminMeResponse>('/admin/auth/me');
  return data;
};
