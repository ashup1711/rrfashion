import apiClient from './client';
import type {
  AuthResponse,
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

export const refreshToken = async (): Promise<void> => {
  // No body needed — the refresh_token cookie is sent automatically
  await apiClient.post('/auth/refresh');
};

export const logout = async (): Promise<void> => {
  // No body needed — cookies are sent automatically
  await apiClient.post('/auth/logout');
};

export const getMe = async (): Promise<User> => {
  const { data } = await apiClient.get<User>('/auth/me');
  return data;
};
