import db from './db';
import { apiClient } from '../api/client';

const SYNC_INTERVAL = 60000;
const CATALOG_SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

interface SyncResultItem {
  status: string;
  clientUuid?: string;
  entity?: string;
  data?: unknown;
  error?: string;
}

export class SyncEngine {
  private deviceUuid: string;
  private apiKey: string;
  private intervalId?: ReturnType<typeof setInterval>;
  private catalogIntervalId?: ReturnType<typeof setInterval>;

  constructor(deviceUuid: string, apiKey: string) {
    this.deviceUuid = deviceUuid;
    this.apiKey = apiKey;
  }

  async queueOrder(order: {
    clientUuid: string;
    storeId: string;
    customerName: string;
    customerPhone?: string;
    items: unknown[];
    totalAmount: number;
    paymentMethod?: string;
  }) {
    await db.syncQueue.add({
      entity: 'order',
      action: 'create',
      data: JSON.stringify(order),
      createdAt: new Date().toISOString(),
    });

    await db.orders.add({
      clientUuid: order.clientUuid,
      storeId: order.storeId,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      items: JSON.stringify(order.items),
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      synced: false,
      createdAt: new Date().toISOString(),
    });
  }

  async queueLock(lock: { clientUuid: string; variantId: string; storeId: string; reason?: string }) {
    await db.syncQueue.add({
      entity: 'lock',
      action: 'create',
      data: JSON.stringify(lock),
      createdAt: new Date().toISOString(),
    });

    await db.locks.add({
      clientUuid: lock.clientUuid,
      variantId: lock.variantId,
      storeId: lock.storeId,
      reason: lock.reason,
      synced: false,
      createdAt: new Date().toISOString(),
    });
  }

  async syncNow(): Promise<{ synced: number; failed: number; conflicts: number }> {
    const pending = await db.syncQueue.orderBy('createdAt').toArray();
    if (pending.length === 0) return { synced: 0, failed: 0, conflicts: 0 };

    const mutations = pending.map((item) => ({
      clientUuid: `${this.deviceUuid}-${item.id}`,
      entity: item.entity,
      operation: item.action,
      data: JSON.parse(item.data),
    }));

    try {
      const response = await apiClient.post('/pos/sync', { mutations }, {
        headers: {
          'x-pos-api-key': this.apiKey,
          'x-pos-device-id': this.deviceUuid,
        },
      });

      const results: SyncResultItem[] = response.data?.data?.results || [];
      let synced = 0;
      let failed = 0;
      let conflicts = 0;

      for (let i = 0; i < results.length; i++) {
        const status = results[i].status;
        if (status === 'applied' || status === 'deduped') {
          await db.syncQueue.delete(pending[i].id!);

          const itemData = JSON.parse(pending[i].data) as { clientUuid: string };
          if (pending[i].entity === 'order') {
            const order = await db.orders
              .where({ clientUuid: itemData.clientUuid })
              .first();
            if (order) await db.orders.update(order.id!, { synced: true });
          } else if (pending[i].entity === 'lock') {
            const lock = await db.locks
              .where({ clientUuid: itemData.clientUuid })
              .first();
            if (lock) await db.locks.update(lock.id!, { synced: true });
          }
          synced++;
        } else if (status === 'conflict') {
          const itemData = JSON.parse(pending[i].data) as { clientUuid: string };
          // Store conflict in IndexedDB for offline tracking
          await db.conflicts.add({
            deviceUuid: this.deviceUuid,
            clientUuid: results[i].clientUuid || itemData.clientUuid,
            entity: results[i].entity || pending[i].entity,
            data: JSON.stringify(results[i].data || pending[i].data),
            error: results[i].error || 'Sync conflict detected',
            status: 'unresolved',
            createdAt: new Date().toISOString(),
          });
          conflicts++;
          failed++;
        } else {
          failed++;
        }
      }

      return { synced, failed, conflicts };
    } catch {
      return { synced: 0, failed: pending.length, conflicts: 0 };
    }
  }

  /** Register background sync for offline mutations */
  async registerBackgroundSync() {
    try {
      if ('serviceWorker' in navigator && 'sync' in (navigator as any).serviceWorker) {
        const registration = await navigator.serviceWorker.ready;
        if ('sync' in registration) {
          await (registration as any).sync.register('sync-pos');
        }
      }
    } catch {
      // Background Sync API not available — fall back to periodic sync
    }
  }

  /** Sync full product catalog for offline use */
  async syncCatalog() {
    try {
      const res = await apiClient.get('/products', { params: { limit: 500 } });
      const products = res.data?.data || [];
      const now = new Date().toISOString();
      for (const product of products) {
        await db.catalog.put({
          id: product.id,
          data: JSON.stringify(product),
          syncedAt: now,
        });
      }
    } catch {
      // Catalog sync failed — will retry on next interval
    }
  }

  onChange?: (result: { synced: number; failed: number; conflicts: number }) => void;

  startAutoSync() {
    // Register background sync for service worker
    this.registerBackgroundSync();

    // Start periodic sync
    this.intervalId = setInterval(async () => {
      const result = await this.syncNow();
      if (this.onChange) {
        this.onChange(result);
      }
    }, SYNC_INTERVAL);

    // Periodic catalog sync
    this.catalogIntervalId = setInterval(() => {
      this.syncCatalog();
    }, CATALOG_SYNC_INTERVAL);
  }

  stopAutoSync() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    if (this.catalogIntervalId) {
      clearInterval(this.catalogIntervalId);
    }
  }
}
