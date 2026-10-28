import { AsyncLocalStorage } from 'async_hooks';

export interface TenantStore {
  tenantId?: string;
  /** Tenant explicitly requested via the X-Tenant-Id header, if any. */
  requestedTenantId?: string;
  /** System jobs that intentionally operate across tenants. */
  bypass?: boolean;
}

const storage = new AsyncLocalStorage<TenantStore>();

export const TenantContext = {
  run<T>(store: TenantStore, fn: () => T): T {
    return storage.run(store, fn);
  },

  runWithTenant<T>(tenantId: string, fn: () => T): T {
    return storage.run({ tenantId }, fn);
  },

  runAsSystem<T>(fn: () => T): T {
    return storage.run({ bypass: true }, fn);
  },

  store(): TenantStore | undefined {
    return storage.getStore();
  },

  tenantId(): string | undefined {
    const store = storage.getStore();
    return store?.bypass ? undefined : store?.tenantId;
  },

  setTenantId(tenantId: string): void {
    const store = storage.getStore();
    if (store) store.tenantId = tenantId;
  },

  requireTenantId(): string {
    const tenantId = TenantContext.tenantId();
    if (!tenantId) throw new Error('Tenant context is not set');
    return tenantId;
  },
};
