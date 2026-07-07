import { useState } from 'react';
import DataTable from '../../../components/ui/DataTable';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import { useAdminWalletStats, useAdminWalletTransactions } from '../../../hooks/useWallet';
import type { Column } from '../../../components/ui/DataTable';
import type { WalletTransaction } from '../../../types/wallet';

const typeOptions = [
  { value: '', label: 'All Types' },
  { value: 'CREDIT', label: 'Credit' },
  { value: 'DEBIT', label: 'Debit' },
  { value: 'REFUND', label: 'Refund' },
  { value: 'PAYMENT', label: 'Payment' },
  { value: 'WITHDRAWAL', label: 'Withdrawal' },
];

const getTypeBadge = (type: string) => {
  switch (type) {
    case 'CREDIT':
      return <Badge variant="success">Credit</Badge>;
    case 'DEBIT':
      return <Badge variant="danger">Debit</Badge>;
    case 'REFUND':
      return <Badge variant="info">Refund</Badge>;
    case 'PAYMENT':
      return <Badge variant="warning">Payment</Badge>;
    case 'WITHDRAWAL':
      return <Badge>Withdrawal</Badge>;
    default:
      return <Badge>{type}</Badge>;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return <Badge variant="success">Completed</Badge>;
    case 'PENDING':
      return <Badge variant="warning">Pending</Badge>;
    case 'FAILED':
      return <Badge variant="danger">Failed</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
};

const WalletManagement = () => {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');

  const { data: stats, isLoading: statsLoading } = useAdminWalletStats();
  const { data: transactions, isLoading: txLoading, error: txError } = useAdminWalletTransactions({
    page,
    limit: 10,
    type: typeFilter || undefined,
  });

  const columns: Column<WalletTransaction>[] = [
    {
      key: 'user',
      header: 'User',
      render: (tx) => (
        <span className="text-gray-900">
          {tx.user?.firstName} {tx.user?.lastName}
        </span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (tx) => getTypeBadge(tx.type),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (tx) => (
        <span
          className={`font-medium ${
            tx.type === 'CREDIT' || tx.type === 'REFUND'
              ? 'text-green-600'
              : 'text-red-600'
          }`}
        >
          {tx.type === 'CREDIT' || tx.type === 'REFUND' ? '+' : '-'}₹
          {tx.amount.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'balanceAfter',
      header: 'Balance After',
      render: (tx) => (
        <span className="text-gray-700">
          ₹{tx.balanceAfter.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (tx) => (
        <span className="text-gray-600 truncate max-w-[200px] block">
          {tx.description}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (tx) => getStatusBadge(tx.status),
    },
    {
      key: 'createdAt',
      header: 'Date',
      render: (tx) => (
        <span className="text-gray-500 text-xs">
          {new Date(tx.createdAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Wallet</h1>
          <p className="mt-1 text-sm text-gray-600">
            Customer wallet balances and transaction history
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <p className="text-sm font-medium text-gray-600">
            Current Balance
          </p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {statsLoading
              ? '—'
              : `₹${(stats?.totalBalance ?? 0).toLocaleString()}`}
          </p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-gray-600">
            Total Credited
          </p>
          <p className="text-3xl font-bold text-green-600 mt-1">
            {statsLoading
              ? '—'
              : `₹${(stats?.totalCredited ?? 0).toLocaleString()}`}
          </p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-gray-600">Total Debited</p>
          <p className="text-3xl font-bold text-red-600 mt-1">
            {statsLoading
              ? '—'
              : `₹${(stats?.totalDebited ?? 0).toLocaleString()}`}
          </p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-gray-600">Total Users</p>
          <p className="text-3xl font-bold text-primary-600 mt-1">
            {statsLoading
              ? '—'
              : (stats?.totalUsers ?? 0).toLocaleString()}
          </p>
        </Card>
      </div>

      {/* Transactions */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPage(1);
          }}
          className="block w-44 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          aria-label="Filter by type"
        >
          {typeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={transactions?.items || []}
        keyExtractor={(item) => item.id}
        isLoading={txLoading}
        error={txError as Error | null}
        emptyTitle="No transactions found"
        emptyDescription={
          typeFilter
            ? 'Try adjusting your filters'
            : 'No wallet transactions have been recorded yet'
        }
        pagination={
          transactions?.meta
            ? {
                page: transactions.meta.page,
                limit: transactions.meta.limit,
                total: transactions.meta.total,
                totalPages: transactions.meta.totalPages,
                onPageChange: setPage,
              }
            : undefined
        }
      />
    </div>
  );
};

export default WalletManagement;
