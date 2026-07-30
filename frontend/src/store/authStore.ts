import { create } from 'zustand';
import type { User } from '../types/user';
import type { AdminUser } from '../types/admin';
import { clearGuestSessionId, clearGuestToken } from '../utils/guestSession';
import { mergeCart } from '../api/cart';
import { mergeWishlist } from '../api/wishlist';
import { getMe } from '../api/auth';
import { adminGetMe } from '../api/admin-auth';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;

  // Admin auth
  adminUser: AdminUser | null;
  adminPermissions: string[];
  isAdminAuthenticated: boolean;
  isAdminAuthValidated: boolean;

  setAuth: (user: User) => void;
  setAdminAuth: (
    admin: AdminUser,
    permissions: string[],
  ) => void;
  setAdminAuthValidated: (validated: boolean) => void;
  initializeAuth: () => Promise<void>;
  initializeAdminAuth: () => Promise<void>;
  logout: () => void;
  adminLogout: () => void;
  updateUser: (user: User) => void;
  updateAdminUser: (admin: AdminUser) => void;
  hasPermission: (module: string, action: string) => boolean;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,

  // Admin auth
  adminUser: null,
  adminPermissions: [],
  isAdminAuthenticated: false,
  isAdminAuthValidated: false,

  setAuth: (user) => {
    // Guest session migration still works — tokens are in cookies now
    const guestSessionId = localStorage.getItem('guest_session_id');

    // Clear local guest data
    clearGuestSessionId();
    clearGuestToken();
    localStorage.removeItem('guest_id');
    localStorage.removeItem('guest_cart_items');
    localStorage.removeItem('guest_wishlist');

    set({
      user,
      isAuthenticated: true,
    });

    // Trigger guest-to-auth cart and wishlist merge in the background
    if (guestSessionId) {
      mergeCart(guestSessionId).catch((err) =>
        console.warn('Guest cart merge failed (non-blocking):', err),
      );
      mergeWishlist(guestSessionId).catch((err) =>
        console.warn('Guest wishlist merge failed (non-blocking):', err),
      );
    }
  },

  setAdminAuth: (admin, permissions) => {
    set({
      adminUser: admin,
      adminPermissions: permissions,
      isAdminAuthenticated: true,
      isAdminAuthValidated: true,
    });
  },

  setAdminAuthValidated: (validated) => {
    set({ isAdminAuthValidated: validated });
  },

  initializeAuth: async () => {
    try {
      const user = await getMe();
      set({ user, isAuthenticated: true });
    } catch {
      set({ user: null, isAuthenticated: false });
    }
  },

  initializeAdminAuth: async () => {
    try {
      const response = await adminGetMe();
      const adminUser: AdminUser = {
        id: response.id,
        name: response.name,
        email: response.email,
        roleId: response.role.id,
        role: response.role,
        storeIds: response.storeIds ?? [],
        isActive: response.isActive,
      };
      set({
        adminUser,
        adminPermissions: response.permissions,
        isAdminAuthenticated: true,
        isAdminAuthValidated: true,
      });
    } catch {
      set({
        adminUser: null,
        adminPermissions: [],
        isAdminAuthenticated: false,
        isAdminAuthValidated: true,
      });
    }
  },

  logout: () => {
    set({
      user: null,
      isAuthenticated: false,
    });
  },

  adminLogout: () => {
    set({
      adminUser: null,
      adminPermissions: [],
      isAdminAuthenticated: false,
      isAdminAuthValidated: false,
    });
  },

  updateUser: (user) => {
    set({ user });
  },

  updateAdminUser: (admin) => {
    set({ adminUser: admin });
  },

  hasPermission: (module, action) => {
    const { adminPermissions } = get();
    return adminPermissions.includes(`${module}:${action}`);
  },

  clearAuth: () => {
    clearGuestSessionId();
    clearGuestToken();
    localStorage.removeItem('guest_id');
    localStorage.removeItem('guest_cart_items');
    localStorage.removeItem('guest_wishlist');
    set({
      user: null,
      isAuthenticated: false,
      adminUser: null,
      adminPermissions: [],
      isAdminAuthenticated: false,
      isAdminAuthValidated: false,
    });
  },
}));
