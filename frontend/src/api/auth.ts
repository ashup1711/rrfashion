import apiClient from './client';
import type {
  AuthResponse,
  RefreshResponse,
  LoginCredentials,
  RegisterData,
  User,
} from '../types/user';

export const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  const { data } = await apiClient.post<AuthResponse>('/auth/login', credentials);
  return data;
};

export const register = async (registerData: RegisterData): Promise<AuthResponse> => {
  const { data } = await apiClient.post<AuthResponse>('/auth/register', registerData);
  return data;
};

export const refreshToken = async (token: string): Promise<RefreshResponse> => {
  const { data } = await apiClient.post<RefreshResponse>('/auth/refresh', {
    refreshToken: token,
  });
  return data;
};

export const logout = async (refreshTokenValue?: string): Promise<void> => {
  await apiClient.post('/auth/logout', { refreshToken: refreshTokenValue });
};

export const getMe = async (): Promise<User> => {
  const { data } = await apiClient.get<User>('/auth/me');
  return data;
};
