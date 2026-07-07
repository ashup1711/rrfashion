import { useState } from 'react';
import DataTable from '../../../components/ui/DataTable';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Modal from '../../../components/ui/Modal';
import {
  useInquiries,
  useAssignInquiry,
  useResolveInquiry,
} from '../../../hooks/useInquiries';
import type { Column } from '../../../components/ui/DataTable';
import type { Inquiry } from '../../../types/inquiry';

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'OPEN', label: 'Open' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'OPEN':
      return <Badge variant="warning">Open</Badge>;
    case 'ASSIGNED':
      return <Badge variant="info">Assigned</Badge>;
    case 'RESOLVED':
      return <Badge variant="success">Resolved</Badge>;
    case 'CLOSED':
      return <Badge>Closed</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
};

const InquiryList = () => {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [resolveModal, setResolveModal] = useState<Inquiry | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [assignModal, setAssignModal] = useState<Inquiry | null>(null);
  const [adminId, setAdminId] = useState('');

  const { data, isLoading, error } = useInquiries({
    page,
    limit: 10,
    status: statusFilter || undefined,
  });

  const assignInquiry = useAssignInquiry();
  const resolveInquiry = useResolveInquiry();

  const handleAssign = async () => {
    if (!assignModal || !adminId) return;
    try {
      await assignInquiry.mutateAsync({
        id: assignModal.id,
        adminId,
      });
      setAssignModal(null);
      setAdminId('');
    } catch {
      // Handle error silently
    }
  };

  const handleResolve = async () => {
    if (!resolveModal) return;
    try {
      await resolveInquiry.mutateAsync({
        id: resolveModal.id,
        notes: resolutionNotes,
      });
      setResolveModal(null);
      setResolutionNotes('');
    } catch {
      // Handle error silently
    }
  };

  const columns: Column<Inquiry>[] = [
    {
      key: 'subject',
      header: 'Subject',
      render: (inquiry) => (
        <div className="max-w-[200px]">
          <p className="font-medium text-gray-900 truncate">
            {inquiry.subject}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {inquiry.message}
          </p>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (inquiry) => (
        <div>
          <p className="text-sm text-gray-900">{inquiry.name}</p>
          <p className="text-xs text-gray-500">{inquiry.email}</p>
        </div>
      ),
    },
    {
      key: 'assignedTo',
      header: 'Assigned To',
      render: (inquiry) => (
        <span className="text-gray-600">
          {inquiry.assignedTo?.name || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (inquiry) => getStatusBadge(inquiry.status),
    },
    {
      key: 'createdAt',
      header: 'Date',
      render: (inquiry) => (
        <span className="text-gray-500 text-xs">
          {new Date(inquiry.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (inquiry) => (
        <div className="flex items-center gap-2">
          {(inquiry.status === 'OPEN' || inquiry.status === 'ASSIGNED') && (
            <>
              {inquiry.status === 'OPEN' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAssignModal(inquiry)}
                >
                  Assign
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setResolveModal(inquiry);
                  setResolutionNotes('');
                }}
                className="text-green-600"
              >
                Resolve
              </Button>
            </>
          )}
          {inquiry.status === 'RESOLVED' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setResolveModal(inquiry);
                setResolutionNotes(inquiry.resolutionNotes || '');
              }}
            >
              View
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
          <h1 className="text-2xl font-bold text-gray-900">Inquiries</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage customer inquiries and support requests
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
        emptyTitle="No inquiries found"
        emptyDescription={
          statusFilter
            ? 'Try adjusting your filters'
            : 'No customer inquiries have been submitted yet'
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

      {/* Assign Modal */}
      <Modal
        isOpen={!!assignModal}
        onClose={() => setAssignModal(null)}
        title="Assign Inquiry"
      >
        {assignModal && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Assigning: <strong>{assignModal.subject}</strong>
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Admin User ID
              </label>
              <input
                type="text"
                value={adminId}
                onChange={(e) => setAdminId(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Enter admin user ID"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setAssignModal(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssign}
                isLoading={assignInquiry.isPending}
                disabled={!adminId}
              >
                Assign
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Resolve Modal */}
      <Modal
        isOpen={!!resolveModal}
        onClose={() => setResolveModal(null)}
        title={
          resolveModal?.status === 'RESOLVED'
            ? 'Resolution Details'
            : 'Resolve Inquiry'
        }
      >
        {resolveModal && (
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-md">
              <p className="text-sm font-medium text-gray-900">
                {resolveModal.subject}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {resolveModal.message}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                From: {resolveModal.name} ({resolveModal.email})
              </p>
            </div>
            {(resolveModal.status === 'OPEN' ||
              resolveModal.status === 'ASSIGNED') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Resolution Notes
                </label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={4}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-400"
                  placeholder="Describe how this inquiry was resolved..."
                />
              </div>
            )}
            {resolveModal.status === 'RESOLVED' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Resolution Notes
                </label>
                <p className="text-sm text-gray-600 p-2 bg-gray-50 rounded">
                  {resolveModal.resolutionNotes || 'No notes recorded'}
                </p>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setResolveModal(null)}
              >
                {resolveModal.status === 'RESOLVED' ? 'Close' : 'Cancel'}
              </Button>
              {(resolveModal.status === 'OPEN' ||
                resolveModal.status === 'ASSIGNED') && (
                <Button
                  onClick={handleResolve}
                  isLoading={resolveInquiry.isPending}
                  disabled={!resolutionNotes.trim()}
                >
                  Mark Resolved
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default InquiryList;
