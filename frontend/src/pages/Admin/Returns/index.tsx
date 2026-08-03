import { useState, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import DataTable from '../../../components/ui/DataTable';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Modal from '../../../components/ui/Modal';
import Select from '../../../components/ui/Select';
import { useAdminReturns, useApproveReturn, useRejectReturn } from '../../../hooks/useAdminReturns';
import { formatCurrency } from '../../../utils/formatCurrency';
import { ROUTES } from '../../../utils/constants';
import type { Column } from '../../../components/ui/DataTable';
import type { AdminReturnListItem } from '../../../api/returns';

/**
 * REQ-FE-003: admin return-request queue at `/admin/returns`.
 *
 * - DataTable with status filter + pagination + client-side order# search
 *   (the backend list endpoint supports `status`/`page`/`limit` via body).
 * - Approve: optional partial refund cap + admin notes.
 * - Reject: required admin notes.
 * Loading / empty / error states are handled by DataTable.
 */

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const statusVariant: Record<string, 'default' | 'warning' | 'success' | 'danger' | 'info'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  COMPLETED: 'info',
  CANCELLED: 'default',
};

const formatDate = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
    : '—';

const AdminReturns = () => {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [actionTarget, setActionTarget] = useState<AdminReturnListItem | null>(null);
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [partialAmount, setPartialAmount] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  const approveMutation = useApproveReturn();
  const rejectMutation = useRejectReturn();

  const { data, isLoading, error } = useAdminReturns({
    page,
    limit: 20,
    status: statusFilter as never,
  });

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
      debounceTimerRef.current = null;
    }, 400);
  }, []);

  // Client-side order# search (the backend list endpoint has no search param).
  const filteredItems = useMemo(() => {
    const items = data?.items ?? [];
    if (!debouncedSearch.trim()) return items;
    const q = debouncedSearch.trim().toLowerCase();
    return items.filter((r) => r.order.orderNumber.toLowerCase().includes(q));
  }, [data, debouncedSearch]);

  const openApprove = useCallback((item: AdminReturnListItem) => {
    setActionTarget(item);
    setAction('approve');
    setPartialAmount('');
    setAdminNotes('');
  }, []);

  const openReject = useCallback((item: AdminReturnListItem) => {
    setActionTarget(item);
    setAction('reject');
    setAdminNotes('');
  }, []);

  const closeAction = useCallback(() => {
    setActionTarget(null);
    setAction(null);
    setPartialAmount('');
    setAdminNotes('');
  }, []);

  const handleConfirmApprove = useCallback(async () => {
    if (!actionTarget) return;
    const parsedAmount = partialAmount.trim() ? Number(partialAmount) : undefined;
    if (partialAmount.trim() && (!Number.isFinite(parsedAmount) || (parsedAmount as number) <= 0)) {
      return;
    }
    await approveMutation.mutateAsync({
      id: actionTarget.id,
      payload: {
        partialRefundAmount: parsedAmount,
        adminNotes: adminNotes.trim() ? adminNotes.trim() : undefined,
      },
    });
    closeAction();
  }, [actionTarget, partialAmount, adminNotes, approveMutation, closeAction]);

  const handleConfirmReject = useCallback(async () => {
    if (!actionTarget) return;
    if (!adminNotes.trim()) return;
    await rejectMutation.mutateAsync({ id: actionTarget.id, adminNotes: adminNotes.trim() });
    closeAction();
  }, [actionTarget, adminNotes, rejectMutation, closeAction]);

  const columns: Column<AdminReturnListItem>[] = [
    {
      key: 'id',
      header: 'Return ID',
      render: (item) => (
        <span className="font-mono text-xs text-gray-500">{item.id.slice(0, 8)}&hellip;</span>
      ),
    },
    {
      key: 'orderNumber',
      header: 'Order#',
      render: (item) => (
        <Link
          to={ROUTES.ADMIN_ORDER_DETAIL(item.orderId)}
          className="font-medium text-primary-600 hover:text-primary-700"
        >
          {item.order.orderNumber}
        </Link>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => (
        <Badge variant={statusVariant[item.status] ?? 'default'}>{item.status}</Badge>
      ),
    },
    {
      key: 'itemCount',
      header: 'Items',
      render: (item) => <span>{item.itemCount}</span>,
    },
    {
      key: 'totalAmount',
      header: 'Order Total',
      render: (item) => <span>{formatCurrency(item.order.totalAmount)}</span>,
    },
    {
      key: 'paymentStatus',
      header: 'Payment',
      render: (item) => <span>{item.order.paymentStatus}</span>,
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (item) => <span>{formatDate(item.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item) =>
        item.status === 'PENDING' ? (
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => openApprove(item)}>
              Approve
            </Button>
            <Button size="sm" variant="outline" onClick={() => openReject(item)}>
              Reject
            </Button>
          </div>
        ) : (
          <span className="text-xs text-gray-400">Resolved</span>
        ),
    },
  ];

  const isActionPending = approveMutation.isPending || rejectMutation.isPending;

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Returns</h1>
          <p className="text-sm text-gray-500 mt-1">
            Review and action customer return requests. Approving queues per-item refunds.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="search"
            placeholder="Search order #..."
            aria-label="Search return requests by order number"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="block w-56 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          <Select
            aria-label="Filter by status"
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="w-40"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredItems}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        error={error as Error | null}
        emptyTitle="No return requests found"
        emptyDescription="Customer return requests will appear here once submitted."
        pagination={
          data?.meta.totalPages
            ? {
                page,
                limit: data.meta.limit,
                total: data.meta.total,
                totalPages: data.meta.totalPages,
                onPageChange: setPage,
              }
            : undefined
        }
      />

      {/* Approve modal */}
      <Modal
        isOpen={action === 'approve' && !!actionTarget}
        onClose={closeAction}
        title="Approve Return"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Approving this return will queue refunds for each returned item
            ({formatCurrency(actionTarget?.order.totalAmount ?? 0)} order total).
          </p>
          <div>
            <label
              htmlFor="partial-amount"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Partial Refund Amount (Optional)
            </label>
            <input
              id="partial-amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="Leave blank for full refund"
              value={partialAmount}
              onChange={(e) => setPartialAmount(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Caps the auto-computed refund total. Leave empty to refund the full amount.
            </p>
          </div>
          <div>
            <label
              htmlFor="approve-notes"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Admin Notes (Optional)
            </label>
            <textarea
              id="approve-notes"
              rows={3}
              maxLength={2000}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Internal notes (max 2000 chars)"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={closeAction} disabled={isActionPending}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmApprove}
              isLoading={approveMutation.isPending}
              disabled={
                partialAmount.trim() !== '' &&
                (!Number.isFinite(Number(partialAmount)) || Number(partialAmount) <= 0)
              }
            >
              Approve &amp; Initiate Refund
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reject modal */}
      <Modal isOpen={action === 'reject' && !!actionTarget} onClose={closeAction} title="Reject Return">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Rejecting this return is permanent. Please provide a reason for the customer.
          </p>
          <div>
            <label
              htmlFor="reject-notes"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Rejection Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              id="reject-notes"
              rows={3}
              maxLength={2000}
              required
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="Explain why this return is being rejected (max 2000 chars)"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={closeAction} disabled={isActionPending}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmReject}
              isLoading={rejectMutation.isPending}
              disabled={!adminNotes.trim()}
            >
              Reject Return
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminReturns;
