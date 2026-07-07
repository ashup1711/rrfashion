import Dexie, { type EntityTable } from 'dexie';

export interface PosOrder {
  id?: number;
  clientUuid: string;
  storeId: string;
  customerName: string;
  customerPhone?: string;
  items: string;
  totalAmount: number;
  paymentMethod?: string;
  synced: boolean;
  createdAt: string;
}

export interface PosLock {
  id?: number;
  clientUuid: string;
  variantId: string;
  storeId: string;
  reason?: string;
  synced: boolean;
  createdAt: string;
}

export interface PosProduct {
  id: string;
  name: string;
  sku: string;
  size: string;
  color: string;
  salePrice: number;
  rentPricePerDay?: number;
  stock: number;
}

export interface PosConflict {
  id?: number;
  deviceUuid: string;
  clientUuid: string;
  entity: string;
  data: string;
  error: string;
  status: string;
  createdAt: string;
}

export interface PosCatalogEntry {
  id: string;
  data: string;
  syncedAt: string;
}

const db = new Dexie('rrfashion_pos') as Dexie & {
  orders: EntityTable<PosOrder, 'id'>;
  locks: EntityTable<PosLock, 'id'>;
  products: EntityTable<PosProduct, 'id'>;
  syncQueue: EntityTable<{ id?: number; entity: string; action: string; data: string; createdAt: string }, 'id'>;
  conflicts: EntityTable<PosConflict, 'id'>;
  catalog: EntityTable<PosCatalogEntry, 'id'>;
};

db.version(2).stores({
  orders: '++id, clientUuid, synced, createdAt',
  locks: '++id, clientUuid, variantId, synced',
  products: 'id, name, sku',
  syncQueue: '++id, createdAt',
  conflicts: '++id, deviceUuid, status, createdAt',
  catalog: 'id, syncedAt',
});

export default db;
