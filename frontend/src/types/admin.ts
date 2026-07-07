import type { Role } from './roles';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  passwordHash?: string;
  roleId: string;
  role: Role;
  storeIds: string[];
  isActive: boolean;
  lastLoginAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminAuthResponse {
  admin: {
    id: string;
    name: string;
    email: string;
    role: Role;
    permissions: string[];
    storeIds: string[];
    isActive: boolean;
  };
  accessToken: string;
  refreshToken: string;
}

export interface AdminMeResponse {
  id: string;
  name: string;
  email: string;
  role: Role;
  permissions: string[];
  storeIds: string[];
  isActive: boolean;
}

export interface CreateAdminUserData {
  name: string;
  email: string;
  password: string;
  roleId: string;
  storeIds?: string[];
}

export interface UpdateAdminUserData {
  name?: string;
  email?: string;
  password?: string;
  roleId?: string;
  isActive?: boolean;
  storeIds?: string[];
}
