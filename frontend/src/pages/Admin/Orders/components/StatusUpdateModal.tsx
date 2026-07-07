import { useState, useMemo } from 'react';
import Modal from '../../../../components/ui/Modal';
import Button from '../../../../components/ui/Button';
import StatusBadge from './StatusBadge';

interface StatusUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStatus: string;
  onConfirm: (status: string, note?: string) => void;
  isUpdating: boolean;
}

// Allowed transitions (matches backend state machine)
const allowedTransitions: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PACKED', 'CANCELLED'],
  PACKED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['OUT_FOR_DELIVERY', 'DELIVERED'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: ['RETURNED'],
  CANCELLED: [],
  RETURNED: [],
};

const statusLabels: Record<string, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  PACKED: 'Packed',
  SHIPPED: 'Shipped',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  RETURNED: 'Returned',
};

const StatusUpdateModal = ({
  isOpen,
  onClose,
  currentStatus,
  onConfirm,
  isUpdating,
}: StatusUpdateModalProps) => {
  const [selectedStatus, setSelectedStatus] = useState('');
  const [note, setNote] = useState('');

  const allowedStatuses = useMemo(() => allowedTransitions[currentStatus] || [], [currentStatus]);

  const handleConfirm = () => {
    if (!selectedStatus) return;
    onConfirm(selectedStatus, note || undefined);
    setSelectedStatus('');
    setNote('');
  };

  const handleClose = () => {
    setSelectedStatus('');
    setNote('');
    onClose();
  };

  const isSubmitDisabled = !selectedStatus || isUpdating;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Update Order Status">
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-2">Current Status:</p>
          <StatusBadge status={currentStatus} />
        </div>

        {allowedStatuses.length === 0 ? (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-700">
              No further status updates are allowed from{' '}
              <span className="font-medium">{statusLabels[currentStatus] || currentStatus}</span>.
            </p>
          </div>
        ) : (
          <>
            <div>
              <label
                htmlFor="new-status"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                New Status
              </label>
              <select
                id="new-status"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                aria-label="Select new status"
              >
                <option value="">Select a status...</option>
                {allowedStatuses.map((status) => (
                  <option key={status} value={status}>
                    {statusLabels[status] || status}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="status-note"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Note (optional)
              </label>
              <textarea
                id="status-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-400"
                placeholder="Add a note about this status change..."
              />
            </div>
          </>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={handleClose} disabled={isUpdating}>
            Cancel
          </Button>
          {allowedStatuses.length > 0 && (
            <Button
              variant="primary"
              onClick={handleConfirm}
              isLoading={isUpdating}
              disabled={isSubmitDisabled}
            >
              Update Status
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default StatusUpdateModal;
