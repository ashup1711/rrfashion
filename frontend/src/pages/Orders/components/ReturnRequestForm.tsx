import { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import { useInitiateReturn } from '../../../hooks/useMyOrders';
import { formatCurrency } from '../../../utils/formatCurrency';
import { uploadReturnPhoto } from '../../../api/returns';
import type { ReturnReason } from '../../../api/returns';
import type { Order, OrderItem } from '../../../types/order';

/**
 * REQ-FE-003: per-item return request form.
 *
 * Matches the REQ-BE-006 DTO exactly:
 *   { items: [{ orderItemId, quantity, reason, photos, notes? }] }
 *
 * - Each selected line gets its own quantity (1..purchased) + reason.
 * - A shared notes field is applied to every selected line.
 * - Photo upload is optional and degrades gracefully when the upload
 *   pipeline is unavailable (photos stay in `photos: string[]` asset keys).
 */

const RETURN_REASONS: Array<{ value: ReturnReason; label: string }> = [
  { value: 'SIZE_ISSUE', label: 'Size issue' },
  { value: 'DEFECT', label: 'Damaged or defective' },
  { value: 'WRONG_ITEM', label: 'Wrong item delivered' },
  { value: 'CHANGED_MIND', label: 'Changed my mind' },
  { value: 'OTHER', label: 'Other' },
];

const MAX_NOTES_LENGTH = 2000;
const MAX_PHOTOS = 5;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface ItemSelection {
  quantity: number;
  reason: ReturnReason | '';
}

interface ReturnRequestFormProps {
  order: Order;
  onClose: () => void;
  onSubmitted?: () => void;
}

const ReturnRequestForm = ({ order, onClose, onSubmitted }: ReturnRequestFormProps) => {
  const [selections, setSelections] = useState<Record<string, ItemSelection>>({});
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const initiateReturnMutation = useInitiateReturn();

  const selectedCount = useMemo(() => Object.keys(selections).length, [selections]);
  const isSubmitting = initiateReturnMutation.isPending;

  const handleToggle = useCallback((item: OrderItem, checked: boolean) => {
    setSelections((prev) => {
      const next = { ...prev };
      if (checked) {
        next[item.id] = { quantity: 1, reason: '' };
      } else {
        delete next[item.id];
      }
      return next;
    });
  }, []);

  const handleQuantity = useCallback((itemId: string, quantity: number) => {
    setSelections((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], quantity },
    }));
  }, []);

  const handleReason = useCallback((itemId: string, reason: ReturnReason) => {
    setSelections((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], reason },
    }));
  }, []);

  const handlePhotos = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      if (fileArray.length === 0) return;

      const room = MAX_PHOTOS - photos.length;
      if (room <= 0) {
        toast.error(`You can attach up to ${MAX_PHOTOS} photos`);
        return;
      }
      const accepted = fileArray
        .slice(0, room)
        .filter((f) => ACCEPTED_IMAGE_TYPES.includes(f.type));
      if (accepted.length === 0) {
        toast.error('Please select JPEG, PNG, or WebP images');
        return;
      }

      setIsUploadingPhoto(true);
      const newKeys: string[] = [];
      const newPreviews: string[] = [];
      try {
        for (const file of accepted) {
          try {
            const result = await uploadReturnPhoto(file);
            newKeys.push(result.storageKey);
            newPreviews.push(result.url);
          } catch (err) {
            console.error('Return photo upload failed (optional — continuing without it):', err);
          }
        }
        if (newKeys.length === 0) {
          toast.info('Photo upload is currently unavailable — you can still submit your return without photos.');
        }
        setPhotos((prev) => [...prev, ...newKeys].slice(0, MAX_PHOTOS));
        setPhotoPreviews((prev) => [...prev, ...newPreviews].slice(0, MAX_PHOTOS));
      } finally {
        setIsUploadingPhoto(false);
      }
    },
    [photos.length],
  );

  const handleRemovePhoto = useCallback((index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(async () => {
    const items = Object.entries(selections).map(([orderItemId, sel]) => ({
      orderItemId,
      quantity: sel.quantity,
      reason: sel.reason,
      photos: photos.length > 0 ? photos : undefined,
      notes: notes.trim() ? notes.trim() : undefined,
    }));

    const reasonCount = Object.values(selections).filter((s) => !!s.reason).length;
    if (items.length === 0) {
      toast.error('Please select at least one item to return.');
      return;
    }
    if (reasonCount < items.length) {
      toast.error('Please select a return reason for every item.');
      return;
    }

    try {
      await initiateReturnMutation.mutateAsync({
        orderId: order.id,
        data: { items },
      });
      setSelections({});
      setNotes('');
      setPhotos([]);
      setPhotoPreviews([]);
      onSubmitted?.();
      onClose();
    } catch {
      // Error toast handled by the mutation's onError.
    }
  }, [selections, photos, notes, order.id, initiateReturnMutation, onSubmitted, onClose]);

  return (
    <Card className="mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">Initiate Return</h3>
      <p className="text-sm text-gray-500 mb-4">
        Select the items you want to return. Each item can be returned with its own quantity and
        reason.
      </p>

      {/* Item selection */}
      <div className="mb-4">
        <p className="text-sm font-medium text-gray-700 mb-2">Select items to return:</p>
        <div className="space-y-2">
          {order.items.map((item) => {
            const sel = selections[item.id];
            const isSelected = !!sel;
            return (
              <div
                key={item.id}
                className={`p-3 border rounded-md transition-colors ${
                  isSelected ? 'border-primary-300 bg-primary-50/50' : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => handleToggle(item, e.target.checked)}
                    className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                    aria-label={`Select ${item.product?.name ?? 'item'} for return`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {item.product?.name ?? 'Product'}
                    </p>
                    {item.variant && (
                      <p className="text-xs text-gray-500">
                        {item.variant.color} / {item.variant.size}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      Purchased: {item.quantity} &times; {formatCurrency(item.unitPrice)}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-gray-900">{formatCurrency(item.totalPrice)}</p>
                </label>

                {isSelected && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor={`return-qty-${item.id}`}
                        className="block text-xs font-medium text-gray-600 mb-1"
                      >
                        Quantity to return
                      </label>
                      <select
                        id={`return-qty-${item.id}`}
                        value={sel.quantity}
                        onChange={(e) => handleQuantity(item.id, Number(e.target.value))}
                        className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      >
                        {Array.from({ length: item.quantity }, (_, i) => i + 1).map((q) => (
                          <option key={q} value={q}>
                            {q} {q === 1 ? 'unit' : 'units'}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Select
                      label="Reason"
                      id={`return-reason-${item.id}`}
                      placeholder="Select a reason"
                      options={RETURN_REASONS}
                      value={sel.reason}
                      onChange={(e) => handleReason(item.id, e.target.value as ReturnReason)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Photo upload */}
      <div className="mb-4">
        <p className="text-sm font-medium text-gray-700 mb-2">
          Photos (Optional) <span className="text-gray-400 font-normal">— evidence of the issue</span>
        </p>
        <div className="flex flex-wrap gap-3">
          {photoPreviews.map((src, idx) => (
            <div key={idx} className="relative">
              <img
                src={src}
                alt={`Return evidence ${idx + 1}`}
                className="w-20 h-20 object-cover rounded-md border border-gray-200"
              />
              <button
                type="button"
                onClick={() => handleRemovePhoto(idx)}
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-600 text-white text-xs flex items-center justify-center hover:bg-red-700"
                aria-label={`Remove photo ${idx + 1}`}
              >
                &times;
              </button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <label
              className={`w-20 h-20 rounded-md border-2 border-dashed flex flex-col items-center justify-center cursor-pointer text-gray-400 hover:border-primary-400 hover:text-primary-500 transition-colors ${
                isUploadingPhoto ? 'opacity-50 pointer-events-none' : 'border-gray-300'
              }`}
              role="button"
              tabIndex={0}
              aria-label="Add return photos"
            >
              {isUploadingPhoto ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <>
                  <svg className="w-5 h-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-[10px]">Add</span>
                </>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="sr-only"
                onChange={(e) => {
                  if (e.target.files) handlePhotos(e.target.files);
                  e.target.value = '';
                }}
              />
            </label>
          )}
        </div>
      </div>

      {/* Notes */}
      <div className="mb-4">
        <label htmlFor="return-notes" className="block text-sm font-medium text-gray-700 mb-1">
          Additional Remarks (Optional)
        </label>
        <textarea
          id="return-notes"
          rows={3}
          maxLength={MAX_NOTES_LENGTH}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          placeholder="Describe the issue (max 2000 characters)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={handleSubmit}
          isLoading={isSubmitting}
          disabled={selectedCount === 0}
        >
          Submit Return Request
        </Button>
        <Button
          variant="outline"
          onClick={onClose}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </Card>
  );
};

export default ReturnRequestForm;
