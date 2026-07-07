export interface Coupon {
  id: string;
  code: string;
  type: 'PERCENT' | 'FLAT';
  value: number;
  minCartValue?: number;
  maxDiscount?: number;
  usageLimit: number;
  usedCount: number;
  perUserLimit: number;
  isActive: boolean;
  validFrom: string;
  validUntil: string;
  description?: string;
  appliesTo?: 'ALL' | 'SALE' | 'RENT';
  categoryIds?: string[];
  brandIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCouponData {
  code: string;
  type: 'PERCENT' | 'FLAT';
  value: number;
  minCartValue?: number;
  maxDiscount?: number;
  usageLimit?: number;
  perUserLimit?: number;
  isActive?: boolean;
  validFrom: string;
  validUntil: string;
  description?: string;
  appliesTo?: 'ALL' | 'SALE' | 'RENT';
  categoryIds?: string[];
  brandIds?: string[];
}

export interface UpdateCouponData {
  code?: string;
  type?: 'PERCENT' | 'FLAT';
  value?: number;
  minCartValue?: number;
  maxDiscount?: number;
  usageLimit?: number;
  perUserLimit?: number;
  isActive?: boolean;
  validFrom?: string;
  validUntil?: string;
  description?: string;
  appliesTo?: 'ALL' | 'SALE' | 'RENT';
  categoryIds?: string[];
  brandIds?: string[];
}
