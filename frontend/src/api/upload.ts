import apiClient from './client';

export interface UploadResponse {
  url: string;
  key: string;
}

export const uploadFile = async (file: File): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await apiClient.post<UploadResponse>('/upload', formData);

  return data;
};

