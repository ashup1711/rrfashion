import { useState } from 'react';
import DataTable from '../../../components/ui/DataTable';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Modal from '../../../components/ui/Modal';
import { useRequestExport, useDownloadExport } from '../../../hooks/useReports';
import type { Column } from '../../../components/ui/DataTable';
import type { ReportExport } from '../../../types/report';

const reportTypes = [
  { value: 'sales', label: 'Sales Report' },
  { value: 'inventory', label: 'Inventory Report' },
  { value: 'rentals', label: 'Rentals Report' },
  { value: 'customers', label: 'Customers Report' },
  { value: 'products', label: 'Products Report' },
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return <Badge variant="success">Completed</Badge>;
    case 'PROCESSING':
      return <Badge variant="warning">Processing</Badge>;
    case 'PENDING':
      return <Badge variant="info">Pending</Badge>;
    case 'FAILED':
      return <Badge variant="danger">Failed</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
};

const ReportList = () => {
  const [page, setPage] = useState(1);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [reportType, setReportType] = useState('sales');
  const [format, setFormat] = useState<'PDF' | 'XLSX'>('PDF');
  const [formError, setFormError] = useState('');

  const requestExport = useRequestExport();
  const downloadExport = useDownloadExport();

  // We use useExportStatus on a per-item basis — for the list we use a generic useQuery
  // Since we don't have a list endpoint in the API, we'll track via the mutation result
  const [recentExports, setRecentExports] = useState<ReportExport[]>([]);

  const handleRequestExport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportType) {
      setFormError('Please select a report type');
      return;
    }
    setFormError('');

    try {
      const result = await requestExport.mutateAsync({
        reportType,
        format,
      });
      setRecentExports((prev) => [result, ...prev]);
      setShowRequestModal(false);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Failed to request export',
      );
    }
  };

  const handleDownload = async (report: ReportExport) => {
    try {
      const blob = await downloadExport.mutateAsync(report.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${report.id}.${report.format.toLowerCase()}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      // Handle error silently
    }
  };

  const columns: Column<ReportExport>[] = [
    {
      key: 'reportType',
      header: 'Report Type',
      render: (report) => (
        <span className="font-medium text-gray-900 capitalize">
          {report.reportType}
        </span>
      ),
    },
    {
      key: 'format',
      header: 'Format',
      render: (report) => (
        <Badge variant="info">{report.format}</Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (report) => getStatusBadge(report.status),
    },
    {
      key: 'requestedBy',
      header: 'Requested By',
      render: (report) => (
        <span className="text-gray-600">
          {report.requestedBy?.name || '—'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Requested',
      render: (report) => (
        <span className="text-gray-500 text-xs">
          {new Date(report.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'completedAt',
      header: 'Completed',
      render: (report) => (
        <span className="text-gray-500 text-xs">
          {report.completedAt
            ? new Date(report.completedAt).toLocaleDateString()
            : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (report) => (
        <div className="flex items-center gap-2">
          {report.status === 'COMPLETED' && report.fileUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDownload(report)}
              isLoading={downloadExport.isPending}
            >
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download
              </span>
            </Button>
          )}
          {report.status === 'FAILED' && (
            <span className="text-xs text-red-500">
              {report.errorMessage || 'Failed'}
            </span>
          )}
          {(report.status === 'PENDING' ||
            report.status === 'PROCESSING') && (
            <span className="text-xs text-gray-400 italic">
              Processing...
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="mt-1 text-sm text-gray-600">
            Request and download export reports
          </p>
        </div>
        <Button onClick={() => setShowRequestModal(true)}>
          + Request Export
        </Button>
      </div>

      {/* Exports Table */}
      <DataTable
        columns={columns}
        data={recentExports}
        keyExtractor={(item) => item.id}
        isLoading={requestExport.isPending}
        error={null}
        emptyTitle="No exports yet"
        emptyDescription="Request your first report export to get started"
        emptyAction={
          <Button onClick={() => setShowRequestModal(true)}>
            + Request Export
          </Button>
        }
        pagination={
          recentExports.length > 10
            ? {
                page,
                limit: 10,
                total: recentExports.length,
                totalPages: Math.ceil(recentExports.length / 10),
                onPageChange: setPage,
              }
            : undefined
        }
      />

      {/* Request Export Modal */}
      <Modal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        title="Request Report Export"
      >
        <form onSubmit={handleRequestExport} className="space-y-4">
          {formError && (
            <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Report Type
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {reportTypes.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Format
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="format"
                  value="PDF"
                  checked={format === 'PDF'}
                  onChange={() => setFormat('PDF')}
                  className="text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">PDF</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="format"
                  value="XLSX"
                  checked={format === 'XLSX'}
                  onChange={() => setFormat('XLSX')}
                  className="text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Excel (XLSX)</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowRequestModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={requestExport.isPending}
            >
              Request Export
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ReportList;
