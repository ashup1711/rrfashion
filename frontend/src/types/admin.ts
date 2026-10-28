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

export type BusinessType = 'RETAIL' | 'SERVICES' | 'MANUFACTURING' | 'RESTAURANT' | 'RENTAL';
export type TenantStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'DELETED';
export type TenantRole = 'OWNER' | 'ADMIN' | 'ACCOUNTANT' | 'STAFF';

export interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  businessType: BusinessType;
  status: TenantStatus;
  plan: string;
  role: TenantRole;
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
  tenants?: TenantSummary[];
  activeTenantId?: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface AdminMeResponse {
  id: string;
  name: string;
  email: string;
  role: Role;
  permissions: string[];
  storeIds: string[];
  isActive: boolean;
  tenants?: TenantSummary[];
  activeTenantId?: string | null;
}

export interface SwitchTenantResponse {
  activeTenantId: string;
  tenants: TenantSummary[];
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
