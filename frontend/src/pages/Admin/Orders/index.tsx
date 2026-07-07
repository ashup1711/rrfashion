import { useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAdminOrders, useUpdateOrderStatus } from '../../../hooks/useAdminOrders';
import StatusBadge from './components/StatusBadge';
import StatusUpdateModal from './components/StatusUpdateModal';
import DataTable from '../../../components/ui/DataTable';
import Button from '../../../components/ui/Button';
import type { Column } from '../../../components/ui/DataTable';
import type { AdminOrder } from '../../../api/adminOrders';

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PACKED', label: 'Packed' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'RETURNED', label: 'Returned' },
];

const AdminOrdersList = () => {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusModalOrder, setStatusModalOrder] = useState<AdminOrder | null>(null);

  const updateStatusMutation = useUpdateOrderStatus();

  // Debounce search input with proper cleanup
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
      debounceTimerRef.current = null;
    }, 400);
  }, []);

  const { data, isLoading, error } = useAdminOrders({
    page,
    limit: 10,
    status: statusFilter || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    search: debouncedSearch || undefined,
  });

  const handleFilterChange = (setter: (value: string) => void) => (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    setter(e.target.value);
    setPage(1);
  };

  const handleStatusUpdate = (orderId: string, status: string, note?: string) => {
    updateStatusMutation.mutate(
      { id: orderId, status, note },
      {
        onSuccess: () => setStatusModalOpen(null),
      },
    );
  };

  // Handler to close modal
  const setStatusModalOpen = (order: AdminOrder | null) => {
    setStatusModalOrder(order);
  };

  const columns: Column<AdminOrder>[] = [
    {
      key: 'orderNumber',
      header: 'Order#',
      render: (order) => (
        <Link
          to={`/admin/orders/${order.id}`}
          className="font-medium text-primary-600 hover:text-primary-700"
        >
          {order.orderNumber}
        </Link>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (order) => (
        <div>
          <p className="font-medium text-gray-900">
            {order.user ? `${order.user.firstName} ${order.user.lastName}` : '—'}
          </p>
          {order.user?.email && (
            <p className="text-xs text-gray-500">{order.user.email}</p>
          )}
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Items',
      render: (order) => (
        <span className="text-gray-700">{order.itemCount ?? order.items?.length ?? 0} item(s)</span>
      ),
    },
    {
      key: 'totalAmount',
      header: 'Total',
      render: (order) => (
        <span className="font-medium text-gray-900">
          ₹{order.totalAmount?.toLocaleString() ?? '0'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (order) => <StatusBadge status={order.status} />,
    },
    {
      key: 'createdAt',
      header: 'Date',
      render: (order) => (
        <span className="text-gray-500 text-xs">
          {new Date(order.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (order) => (
        <div className="flex items-center gap-2">
          <Link
            to={`/admin/orders/${order.id}`}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            View
          </Link>
          {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && order.status !== 'RETURNED' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStatusModalOpen(order)}
              className="text-blue-600 hover:text-blue-700"
            >
              Update
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage and track all customer orders
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <select
          value={statusFilter}
          onChange={handleFilterChange(setStatusFilter)}
          className="block w-44 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          aria-label="Filter by status"
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <div>
            <label htmlFor="date-from" className="sr-only">
              Date From
            </label>
            <input
              id="date-from"
              type="date"
              value={dateFrom}
              onChange={handleFilterChange(setDateFrom)}
              className="block w-40 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              aria-label="Date from"
            />
          </div>
          <span className="text-gray-400">—</span>
          <div>
            <label htmlFor="date-to" className="sr-only">
              Date To
            </label>
            <input
              id="date-to"
              type="date"
              value={dateTo}
              onChange={handleFilterChange(setDateTo)}
              className="block w-40 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              aria-label="Date to"
            />
          </div>
        </div>

        <div>
          <label htmlFor="order-search" className="sr-only">
            Search orders
          </label>
          <input
            id="order-search"
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search order # or email..."
            className="block w-60 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-400"
            aria-label="Search orders"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data?.items || []}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        error={error as Error | null}
        emptyTitle="No orders found"
        emptyDescription={
          statusFilter || debouncedSearch || dateFrom || dateTo
            ? 'Try adjusting your filters'
            : 'No orders have been placed yet'
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

      {/* Status Update Modal */}
      {statusModalOrder && (
        <StatusUpdateModal
          isOpen={!!statusModalOrder}
          onClose={() => setStatusModalOpen(null)}
          currentStatus={statusModalOrder.status}
          onConfirm={(status, note) => handleStatusUpdate(statusModalOrder.id, status, note)}
          isUpdating={updateStatusMutation.isPending}
        />
      )}
    </div>
  );
};

export default AdminOrdersList;
