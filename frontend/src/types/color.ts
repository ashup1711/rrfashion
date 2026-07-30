export interface Color {
  id: string;
  name: string;
  hexCode: string;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateColorData {
  name: string;
  hexCode: string;
  sortOrder?: number;
}

export interface UpdateColorData {
  name?: string;
  hexCode?: string;
  sortOrder?: number;
  isActive?: boolean;
}
