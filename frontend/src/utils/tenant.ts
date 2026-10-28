const ACTIVE_TENANT_KEY = 'admin_active_tenant_id';

export const TENANT_HEADER = 'X-Tenant-Id';

export function getActiveTenantId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_TENANT_KEY);
  } catch {
    return null;
  }
}

export function setActiveTenantId(tenantId: string | null): void {
  try {
    if (tenantId) localStorage.setItem(ACTIVE_TENANT_KEY, tenantId);
    else localStorage.removeItem(ACTIVE_TENANT_KEY);
  } catch {
    // storage unavailable (private mode); header simply won't be sent
  }
}
