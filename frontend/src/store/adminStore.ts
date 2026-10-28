import { create } from 'zustand';
import type { AdminUser, TenantSummary } from '../types/admin';
import { getActiveTenantId, setActiveTenantId as persistActiveTenantId } from '../utils/tenant';

interface AdminState {
  // Session
  adminUser: AdminUser | null;
  permissions: string[];
  isAuthenticated: boolean;

  // UI State
  sidebarCollapsed: boolean;
  activeStoreId: string | null;

  // Tenancy
  tenants: TenantSummary[];
  activeTenantId: string | null;

  // Actions
  setAdminSession: (
    admin: AdminUser,
    permissions: string[],
  ) => void;
  clearAdminSession: () => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setActiveStoreId: (storeId: string | null) => void;
  setTenants: (tenants: TenantSummary[], activeTenantId?: string | null) => void;
  hasPermission: (module: string, action: string) => boolean;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  adminUser: null,
  permissions: [],
  isAuthenticated: false,
  sidebarCollapsed: false,
  activeStoreId: null,
  tenants: [],
  activeTenantId: getActiveTenantId(),

  setAdminSession: (admin, permissions) => {
    set({
      adminUser: admin,
      permissions,
      isAuthenticated: true,
    });
  },

  clearAdminSession: () => {
    set({
      adminUser: null,
      permissions: [],
      isAuthenticated: false,
      activeStoreId: null,
      tenants: [],
      activeTenantId: null,
    });
    persistActiveTenantId(null);
  },

  toggleSidebar: () => {
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
  },

  setSidebarCollapsed: (collapsed) => {
    set({ sidebarCollapsed: collapsed });
  },

  setActiveStoreId: (storeId) => {
    set({ activeStoreId: storeId });
  },

  setTenants: (tenants, activeTenantId) => {
    const active = activeTenantId ?? get().activeTenantId ?? tenants[0]?.id ?? null;
    persistActiveTenantId(active);
    set({ tenants, activeTenantId: active });
  },

  hasPermission: (module, action) => {
    const { permissions } = get();
    return permissions.includes(`${module}:${action}`);
  },
}));
