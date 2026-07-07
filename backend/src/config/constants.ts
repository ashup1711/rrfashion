// ── Route Prefixes ────────────────────────────────────
export const ROUTE_PREFIX = 'api';

// ── Auth JWT Constants ────────────────────────────────
export const PERMISSIONS_KEY = 'permissions';
export const ROLES_KEY = 'roles';
export const IS_PUBLIC_KEY = 'isPublic';

// ── Inventory Lock Constants ──────────────────────────
export const INVENTORY_LOCK_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
export const INVENTORY_LOCK_KEY_PREFIX = 'inventory:lock:';

// ── Audit Log ─────────────────────────────────────────
export const AUDIT_LOG_MODULES = [
  'products',
  'orders',
  'customers',
  'inventory',
  'roles',
  'admin_users',
  'stores',
  'brands',
  'categories',
  'reviews',
  'reports',
  'settings',
] as const;

// ── Store Auth ───────────────────────────────────────
export const ALLOW_GUEST_KEY = 'ALLOW_GUEST';

// ── Soft Delete ──────────────────────────────────────
export const SOFT_DELETE_MODELS = ['Product', 'ProductVariant', 'Category', 'Brand'] as const;
