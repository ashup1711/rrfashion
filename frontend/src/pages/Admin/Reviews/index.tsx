import { useState } from 'react';
import DataTable from '../../../components/ui/DataTable';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Modal from '../../../components/ui/Modal';
import { useAdminReviews, useModerateReview } from '../../../hooks/useReviewAdmin';
import type { Column } from '../../../components/ui/DataTable';
import type { AdminReview } from '../../../api/reviews-admin';

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

const ratingOptions = [
  { value: '', label: 'All Ratings' },
  { value: '5', label: '5 Stars' },
  { value: '4', label: '4 Stars' },
  { value: '3', label: '3 Stars' },
  { value: '2', label: '2 Stars' },
  { value: '1', label: '1 Star' },
];

const ReviewList = () => {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [moderateModal, setModerateModal] = useState<{
    review: AdminReview;
    action: 'APPROVED' | 'REJECTED';
  } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const { data, isLoading, error } = useAdminReviews({
    page,
    limit: 10,
    status: statusFilter || undefined,
    rating: ratingFilter ? Number(ratingFilter) : undefined,
  });

  const moderateReview = useModerateReview();

  const handleModerate = async () => {
    if (!moderateModal) return;
    try {
      await moderateReview.mutateAsync({
        id: moderateModal.review.id,
        data: {
          status: moderateModal.action,
          ...(moderateModal.action === 'REJECTED' && rejectionReason
            ? { rejectionReason }
            : {}),
        },
      });
      setModerateModal(null);
      setRejectionReason('');
    } catch {
      // Error handled by React Query
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge variant="success">Approved</Badge>;
      case 'REJECTED':
        return <Badge variant="danger">Rejected</Badge>;
      default:
        return <Badge variant="warning">Pending</Badge>;
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'text-yellow-400' : 'text-gray-300'
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    );
  };

  const columns: Column<AdminReview>[] = [
    {
      key: 'product',
      header: 'Product',
      render: (review) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
            {review.product.image ? (
              <img
                src={review.product.image}
                alt={review.product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                N/A
              </div>
            )}
          </div>
          <span className="font-medium text-gray-900 truncate max-w-[150px]">
            {review.product.name}
          </span>
        </div>
      ),
    },
    {
      key: 'user',
      header: 'Customer',
      render: (review) => (
        <span className="text-gray-700">
          {review.user.firstName} {review.user.lastName}
        </span>
      ),
    },
    {
      key: 'rating',
      header: 'Rating',
      render: (review) => renderStars(review.rating),
    },
    {
      key: 'comment',
      header: 'Comment',
      render: (review) => (
        <span className="text-gray-600 truncate max-w-[200px] block">
          {review.comment || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (review) => getStatusBadge(review.status),
    },
    {
      key: 'createdAt',
      header: 'Date',
      render: (review) => (
        <span className="text-gray-500 text-xs">
          {new Date(review.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (review) => (
        <div className="flex items-center gap-2">
          {review.status === 'PENDING' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setModerateModal({ review, action: 'APPROVED' })
                }
                className="text-green-600 hover:text-green-700"
              >
                Approve
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setModerateModal({ review, action: 'REJECTED' })
                }
                className="text-red-600 hover:text-red-700"
              >
                Reject
              </Button>
            </>
          )}
          {review.status !== 'PENDING' && (
            <span className="text-xs text-gray-400">
              {review.status === 'APPROVED' ? 'Approved' : 'Rejected'}
              {review.rejectionReason ? ': ' + review.rejectionReason : ''}
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
          <h1 className="text-2xl font-bold text-gray-900">
            Review Moderation
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Approve or reject customer reviews
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
        <select
          value={ratingFilter}
          onChange={(e) => {
            setRatingFilter(e.target.value);
            setPage(1);
          }}
          className="block w-40 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          aria-label="Filter by rating"
        >
          {ratingOptions.map((opt) => (
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
        emptyTitle="No reviews found"
        emptyDescription={
          statusFilter || ratingFilter
            ? 'Try adjusting your filters'
            : 'No reviews have been submitted yet'
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

      {/* Moderate Confirmation Modal */}
      <Modal
        isOpen={!!moderateModal}
        onClose={() => {
          setModerateModal(null);
          setRejectionReason('');
        }}
        title={
          moderateModal?.action === 'APPROVED'
            ? 'Approve Review'
            : 'Reject Review'
        }
      >
        {moderateModal && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {moderateModal.action === 'APPROVED'
                ? 'This review will be visible to customers on the product page.'
                : 'This review will be hidden from customers.'}
            </p>
            <div className="p-3 bg-gray-50 rounded-md">
              <p className="text-sm font-medium text-gray-900">
                {moderateModal.review.user.firstName}{' '}
                {moderateModal.review.user.lastName}
              </p>
              <div className="flex items-center gap-2 mt-1">
                {renderStars(moderateModal.review.rating)}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {moderateModal.review.comment}
              </p>
            </div>
            {moderateModal.action === 'REJECTED' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rejection Reason
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-400"
                  placeholder="Explain why this review is being rejected..."
                />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setModerateModal(null);
                  setRejectionReason('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant={moderateModal.action === 'APPROVED' ? 'primary' : 'danger'}
                isLoading={moderateReview.isPending}
                onClick={handleModerate}
              >
                {moderateModal.action === 'APPROVED' ? 'Approve' : 'Reject'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ReviewList;
