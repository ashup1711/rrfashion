import adminClient from './client';

export interface AuditLog {
  id: string;
  actorId: string;
  actorName?: string;
  actorEmail?: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

export interface AuditLogsResponse {
  items: AuditLog[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AuditLogsFilters {
  actorId?: string;
  action?: string;
  entity?: string;
  entityId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

/**
 * Fetch admin audit logs with filters and pagination.
 * GET /api/admin/audit-logs
 * Admin-only endpoint (AdminJwtAuthGuard + RolesGuard).
 */
export async function getAuditLogs(filters: AuditLogsFilters = {}): Promise<AuditLogsResponse> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && value !== null) {
      params.set(key, String(value));
    }
  });
  const { data } = await adminClient.get<AuditLogsResponse>(`/admin/audit-logs?${params.toString()}`);
  return data;
}

/**
 * Export audit logs as CSV (Blob download).
 */
export async function exportAuditLogs(filters: AuditLogsFilters = {}): Promise<Blob> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && value !== null) {
      params.set(key, String(value));
    }
  });
  params.set('format', 'csv');
  const { data } = await adminClient.get('/admin/audit-logs/export', {
    params: Object.fromEntries(params),
    responseType: 'blob',
    timeout: 30_000,
  });
  return data;
}
