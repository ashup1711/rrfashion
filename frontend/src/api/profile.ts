import apiClient from './client';
import type { User } from '../types/user';

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  addresses?: any[];
}

export interface ProfilePhotoResponse {
  photoUrl: string;
}

export const getProfile = async (): Promise<User> => {
  const { data } = await apiClient.get<User>('/profile');
  return data;
};

export const updateProfile = async (profileData: UpdateProfileData): Promise<User> => {
  const { data } = await apiClient.patch<User>('/profile', profileData);
  return data;
};

export const uploadProfilePhoto = async (file: File): Promise<ProfilePhotoResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post<ProfilePhotoResponse>('/profile/photo', formData);
  return data;
};

export interface DeleteAccountData {
  password: string;
  reason?: string;
}

export const deleteAccount = async (deleteData: DeleteAccountData): Promise<void> => {
  await apiClient.delete('/users/profile/delete-account', { data: deleteData });
};
