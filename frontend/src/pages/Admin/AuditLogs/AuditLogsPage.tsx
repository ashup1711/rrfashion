import { useState, useCallback, useMemo, useEffect } from 'react';
import DataTable from '../../../components/ui/DataTable';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import { useAdminAuditLogs } from '../../../hooks/useAdminAuditLogs';
import { exportAuditLogs, type AuditLog } from '../../../api/admin-audit-logs';
import type { Column } from '../../../components/ui/DataTable';

/**
 * AuditLogsPage — REQ-FE-009
 *
 * Admin activity log page with:
 * - Table view with columns: timestamp, user, action, resource, details
 * - Filters: date range, user, action type
 * - Pagination
 * - Export to CSV
 * - S-008: Debounced text filter inputs to prevent excessive API calls
 */
const AuditLogsPage = () => {
  const [page, setPage] = useState(1);
  const [actorFilterInput, setActorFilterInput] = useState('');
  const [actorFilter, setActorFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // S-008: Debounce the actor filter text input (400ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setActorFilter(actorFilterInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [actorFilterInput]);

  const filters = useMemo(() => ({
    page,
    limit: 20,
    actorId: actorFilter || undefined,
    action: actionFilter || undefined,
    entity: entityFilter || undefined,
    from: fromDate || undefined,
    to: toDate || undefined,
  }), [page, actorFilter, actionFilter, entityFilter, fromDate, toDate]);

  const { data, isLoading, error } = useAdminAuditLogs(filters);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const blob = await exportAuditLogs(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to export audit logs:', err);
    } finally {
      setIsExporting(false);
    }
  }, [filters]);

  const handleClearFilters = useCallback(() => {
    setActorFilterInput('');
    setActorFilter('');
    setActionFilter('');
    setEntityFilter('');
    setFromDate('');
    setToDate('');
    setPage(1);
  }, []);

  const hasActiveFilters = actorFilter || actionFilter || entityFilter || fromDate || toDate;

  // Action badge variant mapping
  const getActionBadgeVariant = (action: string): 'default' | 'success' | 'warning' | 'danger' | 'info' => {
    const lower = action.toLowerCase();
    if (lower.includes('create') || lower.includes('add')) return 'success';
    if (lower.includes('delete') || lower.includes('remove')) return 'danger';
    if (lower.includes('update') || lower.includes('edit')) return 'warning';
    if (lower.includes('login') || lower.includes('auth')) return 'info';
    return 'default';
  };

  const formatTimestamp = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  const columns: Column<AuditLog>[] = [
    {
      key: 'createdAt',
      header: 'Timestamp',
      sortable: true,
      render: (log) => (
        <span className="text-gray-600 text-xs whitespace-nowrap">
          {formatTimestamp(log.createdAt)}
        </span>
      ),
    },
    {
      key: 'actorName',
      header: 'User',
      render: (log) => (
        <div>
          <p className="font-medium text-gray-900">{log.actorName || 'System'}</p>
          {log.actorEmail && (
            <p className="text-xs text-gray-500">{log.actorEmail}</p>
          )}
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (log) => (
        <Badge variant={getActionBadgeVariant(log.action)}>
          {log.action}
        </Badge>
      ),
    },
    {
      key: 'entity',
      header: 'Resource',
      render: (log) => (
        <div>
          <span className="font-medium text-gray-900">{log.entity}</span>
          {log.entityId && (
            <p className="text-xs text-gray-500 font-mono truncate max-w-[120px]">
              {log.entityId}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'details',
      header: 'Details',
      render: (log) => {
        if (!log.details || Object.keys(log.details).length === 0) {
          return <span className="text-gray-400">—</span>;
        }
        const summary = Object.entries(log.details)
          .slice(0, 2)
          .map(([key, val]) => `${key}: ${typeof val === 'object' ? JSON.stringify(val) : String(val)}`)
          .join(', ');
        return (
          <span className="text-xs text-gray-600 truncate max-w-[200px] block" title={JSON.stringify(log.details)}>
            {summary}
          </span>
        );
      },
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity Logs</h1>
          <p className="mt-1 text-sm text-gray-600">
            Track admin actions and system events
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleExport}
          isLoading={isExporting}
          disabled={isExporting}
        >
          {isExporting ? 'Exporting...' : 'Export CSV'}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
        <div>
          <label htmlFor="actor-filter" className="block text-xs font-medium text-gray-600 mb-1">
            User ID
          </label>
          <input
            id="actor-filter"
            type="text"
            value={actorFilterInput}
            onChange={(e) => setActorFilterInput(e.target.value)}
            placeholder="Filter by user..."
            className="block w-48 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <div>
          <label htmlFor="action-filter" className="block text-xs font-medium text-gray-600 mb-1">
            Action Type
          </label>
          <select
            id="action-filter"
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="block w-48 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">All Actions</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
            <option value="LOGIN">Login</option>
            <option value="LOGOUT">Logout</option>
            <option value="EXPORT">Export</option>
            <option value="IMPORT">Import</option>
          </select>
        </div>
        <div>
          <label htmlFor="entity-filter" className="block text-xs font-medium text-gray-600 mb-1">
            Resource
          </label>
          <select
            id="entity-filter"
            value={entityFilter}
            onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
            className="block w-48 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">All Resources</option>
            <option value="Product">Product</option>
            <option value="Order">Order</option>
            <option value="User">User</option>
            <option value="Category">Category</option>
            <option value="Brand">Brand</option>
            <option value="Coupon">Coupon</option>
            <option value="Inventory">Inventory</option>
          </select>
        </div>
        <div>
          <label htmlFor="from-date" className="block text-xs font-medium text-gray-600 mb-1">
            From Date
          </label>
          <input
            id="from-date"
            type="date"
            value={fromDate}
            onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
            className="block w-40 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <div>
          <label htmlFor="to-date" className="block text-xs font-medium text-gray-600 mb-1">
            To Date
          </label>
          <input
            id="to-date"
            type="date"
            value={toDate}
            onChange={(e) => { setToDate(e.target.value); setPage(1); }}
            className="block w-40 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="text-sm text-primary-600 hover:text-primary-700 underline pb-2"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={data?.items || []}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        error={error as Error | null}
        emptyTitle="No activity logs found"
        emptyDescription={
          hasActiveFilters
            ? 'Try adjusting your filters'
            : 'No audit logs have been recorded yet'
        }
        pagination={
          data?.meta
            ? {
                page: data.meta.page,
                limit: data.meta.limit,
                total: data.meta.total,
                totalPages: data.meta.totalPages,
                onPageChange: setPage,
              }
            : undefined
        }
      />
    </div>
  );
};

export default AuditLogsPage;
