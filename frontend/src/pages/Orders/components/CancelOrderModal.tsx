import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import { useCancelOrder } from '../../../hooks/useMyOrders';
import { formatCurrency } from '../../../utils/formatCurrency';
import type { CancellationReason } from '../../../api/orders';
import type { Order } from '../../../types/order';

/**
 * REQ-FE-001: reason-picker cancellation modal.
 *
 * - Shown for orders in [PENDING, CONFIRMED] (customer-cancellable statuses).
 * - Refund estimate is shown when paymentStatus === 'PAID' (computed from
 *   `order.totalAmount`).
 * - The mutation is owned here so the modal is self-contained and reusable.
 */
interface CancelOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  onCancelled?: () => void;
}

// Customer-facing cancellation reasons (subset of the Prisma enum).
const CANCELLATION_REASONS: Array<{ value: CancellationReason; label: string }> = [
  { value: 'CUSTOMER_REQUEST', label: 'Changed my mind' },
  { value: 'OTHER', label: 'Other reason' },
];

const MAX_NOTES_LENGTH = 1000;

const CancelOrderModal = ({ isOpen, onClose, order, onCancelled }: CancelOrderModalProps) => {
  const [reason, setReason] = useState<CancellationReason | ''>('');
  const [notes, setNotes] = useState('');
  const cancelMutation = useCancelOrder();

  const isPaid = order.paymentStatus === 'PAID';
  const canSubmit = !!reason;

  // Reset form state each time the modal opens so stale values never leak.
  useEffect(() => {
    if (isOpen) {
      setReason('');
      setNotes('');
    }
  }, [isOpen]);

  const handleSubmit = useCallback(async () => {
    if (!reason) {
      toast.error('Please select a reason for cancellation.');
      return;
    }
    try {
      await cancelMutation.mutateAsync({
        id: order.id,
        reason,
        notes: notes.trim() ? notes.trim() : undefined,
      });
      onCancelled?.();
      onClose();
    } catch {
      // Error toast is handled by the mutation's onError.
    }
  }, [reason, notes, order.id, cancelMutation, onCancelled, onClose]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cancel Order">
      <div className="space-y-5">
        <p className="text-sm text-gray-600">
          Are you sure you want to cancel order{' '}
          <span className="font-semibold text-gray-900">{order.orderNumber}</span>? This action
          cannot be undone.
        </p>

        {isPaid && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-md" role="status">
            <p className="text-sm text-green-800">
              <span className="font-semibold">Refund estimate:</span>{' '}
              {formatCurrency(order.totalAmount)}
            </p>
            <p className="text-xs text-green-700 mt-1">
              Your payment was already captured. The full amount will be refunded to your original
              payment method after cancellation.
            </p>
          </div>
        )}

        <Select
          label="Reason for cancellation"
          id="cancel-reason"
          placeholder="Select a reason"
          options={CANCELLATION_REASONS}
          value={reason}
          onChange={(e) => setReason(e.target.value as CancellationReason)}
          error={!reason && cancelMutation.isError ? 'Please select a reason.' : undefined}
        />

        <div>
          <label
            htmlFor="cancel-notes"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Additional Notes (Optional)
          </label>
          <textarea
            id="cancel-notes"
            rows={3}
            maxLength={MAX_NOTES_LENGTH}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Tell us more (max 1000 characters)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            aria-describedby="cancel-notes-hint"
          />
          <p id="cancel-notes-hint" className="mt-1 text-xs text-gray-500">
            {notes.length}/{MAX_NOTES_LENGTH}
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose} disabled={cancelMutation.isPending}>
            Keep Order
          </Button>
          <Button
            variant="danger"
            onClick={handleSubmit}
            isLoading={cancelMutation.isPending}
            disabled={!canSubmit}
          >
            Cancel Order
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CancelOrderModal;
