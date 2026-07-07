import { create } from 'zustand';
import type { AdminUser } from '../types/admin';

interface AdminState {
  // Session
  adminUser: AdminUser | null;
  permissions: string[];
  isAuthenticated: boolean;

  // UI State
  sidebarCollapsed: boolean;
  activeStoreId: string | null;

  // Actions
  setAdminSession: (
    admin: AdminUser,
    permissions: string[],
  ) => void;
  clearAdminSession: () => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setActiveStoreId: (storeId: string | null) => void;
  hasPermission: (module: string, action: string) => boolean;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  adminUser: null,
  permissions: [],
  isAuthenticated: false,
  sidebarCollapsed: false,
  activeStoreId: null,

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
    });
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

  hasPermission: (module, action) => {
    const { permissions } = get();
    return permissions.includes(`${module}:${action}`);
  },
}));
