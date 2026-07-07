import { useState } from 'react';
import DataTable from '../../../components/ui/DataTable';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import { useRentals } from '../../../hooks/useRentals';
import type { Column } from '../../../components/ui/DataTable';
import type { RentalBooking } from '../../../types/rental';

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'BOOKED', label: 'Booked' },
  { value: 'IN_USE', label: 'In Use' },
  { value: 'RETURNED', label: 'Returned' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'LATE_RETURN', label: 'Late Return' },
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'BOOKED':
      return <Badge variant="info">Booked</Badge>;
    case 'IN_USE':
      return <Badge variant="warning">In Use</Badge>;
    case 'RETURNED':
      return <Badge>Returned</Badge>;
    case 'CLOSED':
      return <Badge variant="success">Closed</Badge>;
    case 'CANCELLED':
      return <Badge variant="danger">Cancelled</Badge>;
    case 'LATE_RETURN':
      return <Badge variant="danger">Late Return</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
};

const RentalList = () => {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading, error } = useRentals({
    page,
    limit: 10,
    status: statusFilter || undefined,
  });

  const columns: Column<RentalBooking>[] = [
    {
      key: 'customer',
      header: 'Customer',
      render: (rental) => (
        <div>
          <p className="font-medium text-gray-900">
            {rental.user?.firstName} {rental.user?.lastName}
          </p>
          <p className="text-xs text-gray-500">{rental.user?.email}</p>
        </div>
      ),
    },
    {
      key: 'product',
      header: 'Product',
      render: (rental) => (
        <div>
          <p className="font-medium text-gray-900 truncate max-w-[150px]">
            {rental.variant?.product?.name || '—'}
          </p>
          <p className="text-xs text-gray-500">
            {rental.variant?.size} / {rental.variant?.color}
          </p>
        </div>
      ),
    },
    {
      key: 'dates',
      header: 'Duration',
      render: (rental) => (
        <div className="text-xs text-gray-600">
          <p>From: {new Date(rental.startDate).toLocaleDateString()}</p>
          <p>Due: {new Date(rental.dueReturnAt).toLocaleDateString()}</p>
          {rental.returnedAt && (
            <p>
              Returned: {new Date(rental.returnedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (rental) => (
        <div className="text-sm">
          <p className="font-medium">₹{rental.rentAmount.toLocaleString()}</p>
          {rental.lateFee && rental.lateFee > 0 && (
            <p className="text-red-600 text-xs">
              +₹{rental.lateFee} late fee
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (rental) => getStatusBadge(rental.status),
    },
    {
      key: 'createdAt',
      header: 'Booked At',
      render: (rental) => (
        <span className="text-gray-500 text-xs">
          {new Date(rental.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (rental) => (
        <div className="flex items-center gap-2">
          {rental.status === 'BOOKED' && (
            <Button variant="ghost" size="sm" className="text-blue-600">
              Check In
            </Button>
          )}
          {rental.status === 'IN_USE' && (
            <Button variant="ghost" size="sm" className="text-green-600">
              Check Out
            </Button>
          )}
          <Button variant="ghost" size="sm">
            View
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rentals</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage rental bookings and check-in/out flow
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="block w-44 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          aria-label="Filter by status"
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={data?.items || []}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        error={error as Error | null}
        emptyTitle="No rentals found"
        emptyDescription={
          statusFilter
            ? 'Try adjusting your filters'
            : 'No rental bookings have been created yet'
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

export default RentalList;
