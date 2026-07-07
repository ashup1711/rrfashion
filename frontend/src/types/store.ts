export interface StoreLocation {
  id: string;
  name: string;
  address: string;
  city?: string;
  state: string;
  pincode?: string;
  gstin: string;
  phone?: string;
  isActive: boolean;
  createdAt?: string;
}

export interface CreateStoreData {
  name: string;
  address: string;
  city?: string;
  state: string;
  pincode?: string;
  gstin: string;
  phone?: string;
}

export interface UpdateStoreData {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstin?: string;
  phone?: string;
  isActive?: boolean;
}
