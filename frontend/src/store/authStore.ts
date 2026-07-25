import { create } from 'zustand';
import type { User } from '../types/user';
import type { AdminUser } from '../types/admin';
import { clearGuestSessionId, clearGuestToken, getGuestToken } from '../utils/guestSession';
import { mergeCart } from '../api/cart';
import { mergeWishlist } from '../api/wishlist';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshTokenValue: string | null;
  isAuthenticated: boolean;

  // Admin auth
  adminUser: AdminUser | null;
  adminPermissions: string[];
  isAdminAuthenticated: boolean;
  isAdminAuthValidated: boolean;

  setAuth: (user: User, accessToken: string, refreshToken?: string) => void;
  setAdminAuth: (
    admin: AdminUser,
    permissions: string[],
    accessToken: string,
    refreshToken?: string,
  ) => void;
  setAdminAuthValidated: (validated: boolean) => void;
  logout: () => void;
  adminLogout: () => void;
  updateUser: (user: User) => void;
  updateAdminUser: (admin: AdminUser) => void;
  setToken: (token: string) => void;
  setAdminToken: (token: string) => void;
  hasPermission: (module: string, action: string) => boolean;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('auth_token'),
  refreshTokenValue: localStorage.getItem('refresh_token'),
  isAuthenticated: !!localStorage.getItem('auth_token'),

  // Admin auth
  adminUser: null,
  adminPermissions: [],
  isAdminAuthenticated: !!localStorage.getItem('admin_token'),
  isAdminAuthValidated: false,

  setAuth: (user, accessToken, refreshToken) => {
    localStorage.setItem('auth_token', accessToken);
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken);
    }

    // Get guest session ID before clearing it — used for cart/wishlist merge
    const guestSessionId = localStorage.getItem('guest_session_id');

    // Clear local guest data
    clearGuestSessionId();
    clearGuestToken();
    localStorage.removeItem('guest_id');
    localStorage.removeItem('guest_cart_items');
    localStorage.removeItem('guest_wishlist');

    set({
      user,
      token: accessToken,
      refreshTokenValue: refreshToken || get().refreshTokenValue,
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

  setAdminAuth: (admin, permissions, accessToken, refreshToken) => {
    localStorage.setItem('admin_token', accessToken);
    if (refreshToken) {
      localStorage.setItem('admin_refresh_token', refreshToken);
    }
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

  logout: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    set({
      user: null,
      token: null,
      refreshTokenValue: null,
      isAuthenticated: false,
    });
  },

  adminLogout: () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_refresh_token');
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

  setToken: (token) => {
    localStorage.setItem('auth_token', token);
    set({ token });
  },

  setAdminToken: (token) => {
    localStorage.setItem('admin_token', token);
  },

  hasPermission: (module, action) => {
    const { adminPermissions } = get();
    return adminPermissions.includes(`${module}:${action}`);
  },

  clearAuth: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('admin_token');
    clearGuestSessionId();
    clearGuestToken();
    localStorage.removeItem('guest_id');
    localStorage.removeItem('guest_cart_items');
    localStorage.removeItem('guest_wishlist');
    set({
      user: null,
      token: null,
      refreshTokenValue: null,
      isAuthenticated: false,
      adminUser: null,
      adminPermissions: [],
      isAdminAuthenticated: false,
      isAdminAuthValidated: false,
    });
  },
}));
