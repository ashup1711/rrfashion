import { useState, useMemo } from 'react';
import Modal from '../../../../components/ui/Modal';
import Button from '../../../../components/ui/Button';
import Badge from '../../../../components/ui/Badge';

interface PaymentStatusUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPaymentStatus: string;
  paymentMethod: string;
  onConfirm: (paymentStatus: string, note?: string) => void;
  isUpdating: boolean;
}

// Allowed payment status transitions (matches backend state machine)
const allowedPaymentTransitions: Record<string, string[]> = {
  PENDING: ['PAID', 'FAILED'],
};

const paymentStatusLabels: Record<string, string> = {
  PENDING: 'Pending',
  PAID: 'Paid',
  FAILED: 'Failed',
  REFUNDED: 'Refunded',
  PARTIALLY_REFUNDED: 'Partially Refunded',
};

const paymentStatusVariant: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
  PAID: 'success',
  PENDING: 'warning',
  FAILED: 'danger',
  REFUNDED: 'info',
  PARTIALLY_REFUNDED: 'info',
};

const PaymentStatusUpdateModal = ({
  isOpen,
  onClose,
  currentPaymentStatus,
  paymentMethod,
  onConfirm,
  isUpdating,
}: PaymentStatusUpdateModalProps) => {
  const [selectedStatus, setSelectedStatus] = useState('');
  const [note, setNote] = useState('');

  const allowedStatuses = useMemo(
    () => allowedPaymentTransitions[currentPaymentStatus] || [],
    [currentPaymentStatus],
  );

  const isNonCash = paymentMethod !== 'CASH';

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
    <Modal isOpen={isOpen} onClose={handleClose} title="Update Payment Status">
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-2">Current Payment Status:</p>
          <Badge variant={paymentStatusVariant[currentPaymentStatus] || 'default'}>
            {paymentStatusLabels[currentPaymentStatus] || currentPaymentStatus}
          </Badge>
        </div>

        {isNonCash && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">
              Payment status can only be updated for cash delivery orders.
            </p>
          </div>
        )}

        {allowedStatuses.length === 0 && !isNonCash ? (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-700">
              No payment status updates are allowed from{' '}
              <span className="font-medium">
                {paymentStatusLabels[currentPaymentStatus] || currentPaymentStatus}
              </span>
              .
            </p>
          </div>
        ) : (
          !isNonCash && (
            <>
              <div>
                <label
                  htmlFor="new-payment-status"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  New Payment Status
                </label>
                <select
                  id="new-payment-status"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  aria-label="Select new payment status"
                >
                  <option value="">Select a status...</option>
                  {allowedStatuses.map((status) => (
                    <option key={status} value={status}>
                      {paymentStatusLabels[status] || status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="payment-note"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Note (optional)
                </label>
                <textarea
                  id="payment-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, 500))}
                  rows={3}
                  maxLength={500}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-400"
                  placeholder="Add a note about this payment status change..."
                />
                <p className="text-xs text-gray-400 text-right">{note.length}/500</p>
              </div>
            </>
          )
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={handleClose} disabled={isUpdating}>
            Cancel
          </Button>
          {!isNonCash && allowedStatuses.length > 0 && (
            <Button
              variant="primary"
              onClick={handleConfirm}
              isLoading={isUpdating}
              disabled={isSubmitDisabled}
            >
              Update Payment Status
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default PaymentStatusUpdateModal;
