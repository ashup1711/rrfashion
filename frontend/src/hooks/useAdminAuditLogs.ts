import { useQuery } from '@tanstack/react-query';
import { getAuditLogs, type AuditLogsFilters, type AuditLogsResponse } from '../api/admin-audit-logs';
import { QUERY_KEYS, STALE_TIMES } from '../utils/constants';

/**
 * Hook for fetching admin audit logs with TanStack Query.
 * Admin-only endpoint — user-specific data keyed by filters.
 * SEC-14/SEC-17: User-specific data — short staleTime, no cross-user caching.
 */
export const useAdminAuditLogs = (filters: AuditLogsFilters) => {
  return useQuery<AuditLogsResponse>({
    queryKey: [QUERY_KEYS.auditLogs, filters],
    queryFn: () => getAuditLogs(filters),
    staleTime: STALE_TIMES.auditLogs,
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
};
