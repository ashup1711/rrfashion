import { useState } from 'react';
import DataTable from '../../../components/ui/DataTable';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import { useInvoices } from '../../../hooks/useInvoices';
import { downloadPdf } from '../../../api/invoices';
import type { Column } from '../../../components/ui/DataTable';
import type { Invoice } from '../../../types/invoice';

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'PAID', label: 'Paid' },
  { value: 'OVERDUE', label: 'Overdue' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'REFUNDED', label: 'Refunded' },
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'PAID':
      return <Badge variant="success">Paid</Badge>;
    case 'PENDING':
      return <Badge variant="warning">Pending</Badge>;
    case 'OVERDUE':
      return <Badge variant="danger">Overdue</Badge>;
    case 'CANCELLED':
      return <Badge>Canceled</Badge>;
    case 'REFUNDED':
      return <Badge variant="info">Refunded</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
};

const InvoiceList = () => {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading, error } = useInvoices({
    page,
    limit: 10,
    status: statusFilter || undefined,
  });

  const handleDownloadPdf = async (id: string) => {
    try {
      const blob = await downloadPdf(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      // Error handled silently
    }
  };

  const columns: Column<Invoice>[] = [
    {
      key: 'invoiceNumber',
      header: 'Invoice #',
      render: (invoice) => (
        <span className="font-medium text-gray-900">
          {invoice.invoiceNumber}
        </span>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (invoice) => (
        <div>
          <p className="text-sm text-gray-900">
            {invoice.order?.user?.firstName} {invoice.order?.user?.lastName}
          </p>
          <p className="text-xs text-gray-500">{invoice.order?.user?.email}</p>
        </div>
      ),
    },
    {
      key: 'total',
      header: 'Amount',
      render: (invoice) => (
        <span className="font-medium">
          ₹{invoice.totalAmount.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (invoice) => getStatusBadge(invoice.status),
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      render: (invoice) => (
        <span className="text-gray-500 text-sm">
          {invoice.dueDate
            ? new Date(invoice.dueDate).toLocaleDateString()
            : '—'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (invoice) => (
        <span className="text-gray-500 text-xs">
          {new Date(invoice.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (invoice) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDownloadPdf(invoice.id)}
          >
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              PDF
            </span>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="mt-1 text-sm text-gray-600">
            View and download customer invoices
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
        emptyTitle="No invoices found"
        emptyDescription={
          statusFilter
            ? 'Try adjusting your filters'
            : 'No invoices have been generated yet'
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

export default InvoiceList;
