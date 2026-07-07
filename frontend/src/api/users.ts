import apiClient from './client';
import type { User } from '../types/user';

export const getUsers = async (): Promise<User[]> => {
  const { data } = await apiClient.get<User[]>('/users');
  return data;
};

export const getUser = async (id: string): Promise<User> => {
  const { data } = await apiClient.get<User>(`/users/${id}`);
  return data;
};

export const updateUser = async (id: string, userData: Partial<User>): Promise<User> => {
  const { data } = await apiClient.patch<User>(`/users/${id}`, userData);
  return data;
};

export const deleteUser = async (id: string): Promise<void> => {
  await apiClient.delete(`/users/${id}`);
};
