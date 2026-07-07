export interface Brand {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateBrandData {
  name: string;
  description?: string;
}

export interface UpdateBrandData {
  name?: string;
  description?: string;
  isActive?: boolean;
}
