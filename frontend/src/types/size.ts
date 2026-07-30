export interface Size {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSizeData {
  name: string;
  sortOrder?: number;
}

export interface UpdateSizeData {
  name?: string;
  sortOrder?: number;
  isActive?: boolean;
}
