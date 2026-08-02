import { create } from 'zustand';
import type { User } from '../types/user';
import type { AdminUser } from '../types/admin';
import { clearGuestSessionId, clearGuestToken, getGuestToken } from '../utils/guestSession';
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

// REQ-SEC-FE-005 / SEC-17: wipe service-worker caches on logout so stale
// user-specific payloads cannot survive across users on a shared device.
async function clearPwaCaches(): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) return;
  try {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  } catch {
    /* noop — cache cleanup is best-effort */
  }
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
    // REQ-FE-GUEST-002: capture guest state BEFORE dispatching merges and
    // clear guest data AFTER the merge requests are created — the axios
    // interceptor reads localStorage['guest_token'] synchronously at request
    // creation, so the merge requests carry the guest Bearer header and the
    // backend merges that exact session. Clearing first would merge nothing.
    const hadGuestToken = !!getGuestToken();
    const hadGuestSession = !!localStorage.getItem('guest_session_id');

    set({
      user,
      isAuthenticated: true,
    });

    if (hadGuestToken || hadGuestSession) {
      // Identity travels in the Authorization header (no body id — REQ-FE-GUEST-001)
      mergeCart().catch((err) =>
        console.warn('Guest cart merge failed (non-blocking):', err),
      );
      mergeWishlist().catch((err) =>
        console.warn('Guest wishlist merge failed (non-blocking):', err),
      );
    }

    // Clear guest data AFTER the merge requests are created
    clearGuestSessionId();
    clearGuestToken();
    localStorage.removeItem('guest_id');
    localStorage.removeItem('guest_cart_items');
    localStorage.removeItem('guest_wishlist');
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
    // REQ-SEC-FE-005: fire-and-forget SW cache purge on logout
    void clearPwaCaches();
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
    // REQ-SEC-FE-005: fire-and-forget SW cache purge on full auth clear
    void clearPwaCaches();
  },
}));
