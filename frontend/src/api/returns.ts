import apiClient from './client';
import adminClient from './admin-client';
import axios from 'axios';
import type { ReturnItemInput, ReturnRequest, ReturnRequestItem } from './orders';
import type { Refund } from './refunds';

/**
 * REQ-FE-003: customer + admin return-request API surface.
 *
 * Customer routes are on the storefront `apiClient` (cookie auth + guest
 * Bearer); admin routes use `adminClient` (admin cookie auth).
 */

// ---------------------------------------------------------------------------
// Customer
// ---------------------------------------------------------------------------

/**
 * ReturnReason values match the Prisma `ReturnReason` enum — the backend DTO
 * validates against these exact strings.
 */
export type ReturnReason = 'SIZE_ISSUE' | 'DEFECT' | 'WRONG_ITEM' | 'CHANGED_MIND' | 'OTHER';

/**
 * REQ-BE-006: initiate a per-item return request for a delivered order.
 * Response: `{ returnRequest, items }`.
 */
export const createReturn = async (
  orderId: string,
  items: ReturnItemInput[],
): Promise<{ returnRequest: ReturnRequest; items: ReturnRequestItem[] }> => {
  const { data } = await apiClient.post(`/orders/${orderId}/return`, { items });
  return data;
};

/**
 * Upload a return photo via the generic temp-upload pipeline and return the
 * asset `storageKey` to store on the ReturnRequestItem.
 *
 * Uses a bare axios instance (NOT apiClient) so a failed upload (e.g. the
 * upload endpoint being admin-only in this deployment) surfaces as a plain
 * error instead of triggering the apiClient 401 → login redirect. The return
 * form treats photo upload as optional and degrades gracefully.
 */
const uploadClient = axios.create({
  baseURL: (typeof window !== 'undefined'
    ? localStorage.getItem('api_url') || (window as any).__RUNTIME_ENV__?.API_URL
    : undefined) || import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  withCredentials: true,
  timeout: 30000,
});

export interface ReturnPhotoUploadResult {
  tempId: string;
  url: string;
  storageKey: string;
  expiresAt: string;
}

export const uploadReturnPhoto = async (file: File): Promise<ReturnPhotoUploadResult> => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await uploadClient.post<ReturnPhotoUploadResult>('/upload/temp', formData);
  return data;
};

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export type AdminReturnStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';

export interface AdminReturnOrderSummary {
  id: string;
  orderNumber: string;
  userId?: string | null;
  totalAmount: number;
  paymentStatus: string;
}

export interface AdminReturnListItem {
  id: string;
  orderId: string;
  order: AdminReturnOrderSummary;
  status: AdminReturnStatus;
  adminNotes?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  itemCount: number;
}

export interface AdminReturnsResponse {
  items: AdminReturnListItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface AdminReturnsParams {
  page?: number;
  limit?: number;
  status?: AdminReturnStatus | '';
}

/**
 * REQ-BE-007: list the return-request queue for the admin UI.
 * Response: `{ items, meta }`.
 *
 * NOTE: the backend controller is `@Get('admin/returns')` but reads the
 * filter object from `@Body()` — so we send the body via axios `data`
 * config on a GET request (axios v1 supports this).
 */
export const getAdminReturns = async (params: AdminReturnsParams = {}): Promise<AdminReturnsResponse> => {
  const { data } = await adminClient.get<AdminReturnsResponse>('/admin/returns', { data: params });
  return data;
};

export interface ApproveReturnPayload {
  /** Optional cap on the total refund (INR, decimal) */
  partialRefundAmount?: number;
  /** Internal admin notes (max 2000 chars) */
  adminNotes?: string;
}

export interface ApproveReturnResult {
  returnRequest: {
    id: string;
    status: AdminReturnStatus;
    resolvedAt: string;
    adminNotes?: string | null;
  };
  refunds: Array<{ itemId: string; refundId: string; amount: number }>;
}

/**
 * REQ-BE-007: approve a return request — queues per-item refunds.
 * Response: `{ returnRequest, refunds }`.
 */
export const approveReturn = async (id: string, payload: ApproveReturnPayload = {}): Promise<ApproveReturnResult> => {
  const { data } = await adminClient.post<ApproveReturnResult>(`/admin/returns/${id}/approve`, payload);
  return data;
};

export interface RejectReturnResult {
  returnRequest: {
    id: string;
    orderId: string;
    status: AdminReturnStatus;
    resolvedAt?: string | null;
    adminNotes?: string | null;
  };
}

/**
 * REQ-BE-007: reject a return request. `adminNotes` is required.
 */
export const rejectReturn = async (id: string, adminNotes: string): Promise<RejectReturnResult> => {
  const { data } = await adminClient.post<RejectReturnResult>(`/admin/returns/${id}/reject`, { adminNotes });
  return data;
};

// Re-export types used by consumers of this module
export type { Refund };
