import { useMemo } from 'react';
import { motion } from 'framer-motion';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import { useRefundTimeline } from '../../../hooks/useRefundTimeline';
import { formatCurrency } from '../../../utils/formatCurrency';
import type { Refund, RefundStatus } from '../../../api/refunds';

/**
 * REQ-FE-004: vertical refund timeline embedded in the order detail page.
 *
 * Renders INITIATED → PROCESSED / FAILED per refund with timestamps and
 * amounts. The backend returns refunds sorted oldest-first so the timeline
 * reads naturally. Uses framer-motion for the entrance animation.
 *
 * Loading / empty / error states are all handled explicitly.
 */

const statusMeta: Record<RefundStatus, { label: string; badgeVariant: 'warning' | 'success' | 'danger' }> = {
  INITIATED: { label: 'Refund Initiated', badgeVariant: 'warning' },
  PROCESSED: { label: 'Refund Processed', badgeVariant: 'success' },
  FAILED: { label: 'Refund Failed', badgeVariant: 'danger' },
};

const formatDate = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
};

interface RefundTimelineProps {
  orderId: string;
}

const RefundTimeline = ({ orderId }: RefundTimelineProps) => {
  const { data, isLoading, isError, error } = useRefundTimeline(orderId);

  const refunds = useMemo(() => data?.refunds ?? [], [data]);

  if (isLoading) {
    return (
      <Card className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Refunds</h3>
        <LoadingSpinner size="sm" label="Loading refund status..." />
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Refunds</h3>
        <p className="text-sm text-red-600" role="alert">
          Unable to load refund status. Please try again later.
        </p>
        {error instanceof Error && (
          <p className="mt-1 text-xs text-gray-400">{error.message}</p>
        )}
      </Card>
    );
  }

  if (refunds.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Refunds</h3>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-0"
        role="list"
        aria-label="Refund timeline"
      >
        {refunds.map((refund: Refund) => {
          const meta = statusMeta[refund.status] ?? statusMeta.INITIATED;
          const isTerminal = refund.status !== 'INITIATED';
          return (
            <motion.div key={refund.id} variants={itemVariants} className="flex gap-4" role="listitem">
              {/* Timeline rail */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                    isTerminal
                      ? refund.status === 'FAILED'
                        ? 'bg-red-500 border-red-500'
                        : 'bg-green-500 border-green-500'
                      : 'bg-amber-400 border-amber-400 animate-pulse'
                  }`}
                  aria-hidden="true"
                />
                {refunds.length > 1 && (
                  <div className="w-0.5 flex-1 bg-gray-200" aria-hidden="true" />
                )}
              </div>

              {/* Step content */}
              <div className="pb-6 last:pb-0 flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">{meta.label}</p>
                    <Badge variant={meta.badgeVariant}>{refund.status}</Badge>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatCurrency(refund.amount)}
                  </p>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {formatDate(refund.initiatedAt)}
                </p>
                {isTerminal && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {refund.status === 'FAILED' ? 'Failed at' : 'Processed at'}{' '}
                    {formatDate(refund.processedAt) ?? '—'}
                  </p>
                )}
                {refund.status === 'FAILED' && (
                  <p className="text-xs text-red-600 mt-1">
                    The refund could not be completed. Please contact support.
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </Card>
  );
};

export default RefundTimeline;
