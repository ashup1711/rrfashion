import type { ProductVariant } from './product';
import type { StoreLocation } from './store';

export interface InventorySummary {
  variantId: string;
  storeId: string;
  quantityAvailable: number;
  quantityReserved: number;
  quantityLocked: number;
  quantitySold: number;
  variant?: ProductVariant;
  store?: StoreLocation;
}

export interface InventoryUnit {
  id: string;
  variantId: string;
  storeId: string;
  status: 'available' | 'reserved' | 'rented_out' | 'sold' | 'damaged' | 'in_wash' | 'under_repair' | 'lost';
  conditionNotes?: string;
  variant?: ProductVariant;
  store?: StoreLocation;
  createdAt?: string;
  updatedAt?: string;
}

export interface InventoryLock {
  id: string;
  variantId: string;
  storeId: string;
  lockedByAdminId?: string;
  deviceId?: string;
  clientUuid: string;
  quantity: number;
  reason?: string;
  status: 'active' | 'released' | 'expired';
  lockedAt: string;
  expiresAt: string;
  releasedAt?: string;
  createdAt?: string;
  variant?: ProductVariant;
  store?: StoreLocation;
}

export interface InventoryVariantDetail {
  variant: ProductVariant;
  summary: InventorySummary[];
  units: InventoryUnit[];
  activeLocks: InventoryLock[];
}

export interface CreateLockData {
  variantId: string;
  storeId: string;
  reason?: string;
  quantity?: number;
}
