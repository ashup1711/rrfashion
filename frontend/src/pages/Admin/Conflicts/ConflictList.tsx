import { useState } from 'react';
import { toast } from 'sonner';
import DataTable from '../../../components/ui/DataTable';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import { usePosConflicts, useResolveConflict } from '../../../hooks/usePosConflicts';
import type { Column } from '../../../components/ui/DataTable';
import type { PosSyncConflict } from '../../../api/pos';

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'unresolved', label: 'Unresolved' },
  { value: 'resolved', label: 'Resolved' },
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'unresolved':
      return <Badge variant="danger">Unresolved</Badge>;
    case 'resolved':
      return <Badge variant="success">Resolved</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
};

const getEntityBadge = (entity: string) => {
  switch (entity) {
    case 'order':
      return <Badge variant="info">Order</Badge>;
    case 'lock':
      return <Badge variant="warning">Lock</Badge>;
    default:
      return <Badge>{entity}</Badge>;
  }
};

const ConflictList = () => {
  const [statusFilter, setStatusFilter] = useState('unresolved');
  const [storeFilter, setStoreFilter] = useState('');

  const { data, isLoading, error } = usePosConflicts({
    status: statusFilter || undefined,
    storeId: storeFilter || undefined,
  });

  const resolveConflict = useResolveConflict();

  const conflicts = data?.conflicts || [];

  const handleResolve = async (id: string) => {
    try {
      await resolveConflict.mutateAsync(id);
      toast.success('Conflict resolved');
    } catch {
      toast.error('Failed to resolve conflict');
    }
  };

  const handleResolveAll = async () => {
    const unresolved = conflicts.filter((c) => c.status === 'unresolved');
    if (unresolved.length === 0) {
      toast.info('No unresolved conflicts');
      return;
    }

    try {
      for (const conflict of unresolved) {
        await resolveConflict.mutateAsync(conflict.id);
      }
      toast.success(`Resolved ${unresolved.length} conflicts`);
    } catch {
      toast.error('Failed to resolve some conflicts');
    }
  };

  const columns: Column<PosSyncConflict>[] = [
    {
      key: 'entity',
      header: 'Item',
      render: (conflict) => getEntityBadge(conflict.entity),
    },
    {
      key: 'deviceUuid',
      header: 'Device',
      render: (conflict) => (
        <span className="text-sm font-mono text-gray-600">
          {conflict.deviceUuid.slice(0, 8)}...
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Timestamp',
      render: (conflict) => (
        <span className="text-sm text-gray-500">
          {new Date(conflict.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'error',
      header: 'Error',
      render: (conflict) => (
        <span className="text-sm text-red-600 max-w-[200px] block truncate" title={conflict.error}>
          {conflict.error}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (conflict) => getStatusBadge(conflict.status),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (conflict) => (
        <div className="flex items-center gap-2">
          {conflict.status === 'unresolved' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleResolve(conflict.id)}
              isLoading={resolveConflict.isPending}
            >
              Resolve
            </Button>
          )}
          {conflict.status === 'resolved' && (
            <span className="text-xs text-gray-400">Done</span>
          )}
        </div>
      ),
    },
  ];

  const unresolvedCount = conflicts.filter((c) => c.status === 'unresolved').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">POS Sync Conflicts</h1>
          <p className="mt-1 text-sm text-gray-600">
            {unresolvedCount > 0
              ? `${unresolvedCount} unresolved conflict${unresolvedCount > 1 ? 's' : ''} requiring attention`
              : 'No unresolved conflicts'}
          </p>
        </div>
        {unresolvedCount > 0 && (
          <Button
            variant="danger"
            onClick={handleResolveAll}
            isLoading={resolveConflict.isPending}
          >
            Resolve All ({unresolvedCount})
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="block w-44 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          aria-label="Filter by status"
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Filter by store ID"
          value={storeFilter}
          onChange={(e) => setStoreFilter(e.target.value)}
          className="block w-44 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          aria-label="Filter by store ID"
        />
      </div>

      <DataTable
        columns={columns}
        data={conflicts}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        error={error as Error | null}
        emptyTitle="No conflicts found"
        emptyDescription={
          statusFilter
            ? 'Try adjusting your filters'
            : 'All POS syncs are running smoothly'
        }
      />
    </div>
  );
};

export default ConflictList;
