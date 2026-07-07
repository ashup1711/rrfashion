import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import Modal from '../../../../components/ui/Modal';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
import { useAdjustStock } from '../../../../hooks/useInventory';
import type { InventoryListItem } from '../../../../api/inventory';

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryListItem | null;
  storeFilter: string;
  stores: { id: string; name: string }[];
}

type AdjustmentType = 'add' | 'remove' | 'set';

const StockAdjustmentModal = ({
  isOpen,
  onClose,
  item,
  storeFilter,
  stores,
}: StockAdjustmentModalProps) => {
  const adjustStockMutation = useAdjustStock();

  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('add');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen && item) {
      setSelectedStoreId(storeFilter || item.storeId || '');
      setAdjustmentType('add');
      setQuantity('');
      setNotes('');
    }
  }, [isOpen, item, storeFilter]);

  const availableStores = useMemo(() => {
    if (storeFilter) {
      return stores.filter((s) => s.id === storeFilter);
    }
    return stores;
  }, [storeFilter, stores]);

  if (!item) return null;

  const currentAvailable = item.quantityAvailable;

  const getQuantityChange = (): number => {
    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) return 0;
    switch (adjustmentType) {
      case 'add':
        return qty;
      case 'remove':
        return -qty;
      case 'set':
        return qty - currentAvailable;
    }
  };

  const handleApply = async () => {
    const qty = Number(quantity);
    if (!selectedStoreId) {
      toast.error('Please select a store');
      return;
    }
    if (isNaN(qty) || qty <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }
    if (adjustmentType === 'remove' && qty > currentAvailable) {
      toast.error('Cannot remove more than current available stock');
      return;
    }

    try {
      await adjustStockMutation.mutateAsync({
        variantId: item.variantId,
        storeId: selectedStoreId,
        quantityChange: getQuantityChange(),
        type: 'ADJUSTMENT',
        notes: notes || undefined,
      });
      toast.success('Stock adjusted successfully');
      onClose();
    } catch {
      toast.error('Failed to adjust stock');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Adjust Stock - ${item.variant.product.name} (${item.variant.sku})`}>
      <div className="space-y-4">
        <div className="p-3 bg-gray-50 rounded-md">
          <p className="text-sm font-medium text-gray-900">
            {item.variant.product.name}
          </p>
          <div className="flex gap-3 text-xs text-gray-600 mt-1">
            <span>SKU: {item.variant.sku}</span>
            <span>Size: {item.variant.size}</span>
            <span>Color: {item.variant.color}</span>
          </div>
          <div className="flex gap-3 text-xs mt-2 pt-2 border-t border-gray-200">
            <span className="text-green-600">Available: {item.quantityAvailable}</span>
            <span className="text-orange-600">Locked: {item.quantityLocked}</span>
            <span className="text-gray-600">Sold: {item.quantitySold}</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Store
          </label>
          <select
            value={selectedStoreId}
            onChange={(e) => setSelectedStoreId(e.target.value)}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            aria-label="Select store"
          >
            <option value="">Select a store</option>
            {availableStores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Adjustment Type
          </label>
          <div className="flex gap-4" role="radiogroup" aria-label="Adjustment type">
            {(['add', 'remove', 'set'] as AdjustmentType[]).map((type) => (
              <label
                key={type}
                className={`flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer text-sm transition-colors ${
                  adjustmentType === type
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="adjustmentType"
                  value={type}
                  checked={adjustmentType === type}
                  onChange={() => setAdjustmentType(type)}
                  className="sr-only"
                />
                {type === 'add' ? 'Add' : type === 'remove' ? 'Remove' : 'Set Absolute'}
              </label>
            ))}
          </div>
        </div>

        <Input
          label={adjustmentType === 'set' ? 'New Stock Quantity' : 'Quantity'}
          type="number"
          min="0"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder={
            adjustmentType === 'set'
              ? 'Enter new stock quantity'
              : 'Enter quantity'
          }
        />

        {adjustmentType === 'set' && quantity && !isNaN(Number(quantity)) && Number(quantity) > 0 && (
          <p className="text-xs text-gray-500">
            Will adjust by {getQuantityChange() >= 0 ? '+' : ''}
            {getQuantityChange()} unit{Math.abs(getQuantityChange()) !== 1 ? 's' : ''}
          </p>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reason / Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-400"
            placeholder="Reason for adjustment (optional)"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            isLoading={adjustStockMutation.isPending}
          >
            Apply
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default StockAdjustmentModal;
