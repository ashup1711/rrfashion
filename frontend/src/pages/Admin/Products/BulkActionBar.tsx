import { useState, useCallback } from 'react';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import { useBulkUpdateProducts } from '../../../hooks/useProducts';
import type { BulkUpdateItem } from '../../../api/products';

interface BulkActionBarProps {
  selectedIds: string[];
  onClearSelection: () => void;
}

type BulkAction = 'activate' | 'deactivate' | 'updatePrice';

/**
 * BulkActionBar — REQ-FE-010
 *
 * Batch action toolbar that appears when products are selected.
 * Supports: change status, update price for selected products.
 */
const BulkActionBar = ({ selectedIds, onClearSelection }: BulkActionBarProps) => {
  const [activeAction, setActiveAction] = useState<BulkAction | null>(null);
  const [newPrice, setNewPrice] = useState('');
  const { mutate: bulkUpdate, isPending } = useBulkUpdateProducts();

  const handleBulkAction = useCallback(() => {
    if (!activeAction) return;

    let items: BulkUpdateItem[] = [];

    switch (activeAction) {
      case 'activate':
        items = selectedIds.map((id) => ({ productId: id, isActive: true }));
        break;
      case 'deactivate':
        items = selectedIds.map((id) => ({ productId: id, isActive: false }));
        break;
      case 'updatePrice':
        if (!newPrice || isNaN(Number(newPrice))) return;
        items = selectedIds.map((id) => ({ productId: id, basePrice: Number(newPrice) }));
        break;
    }

    if (items.length === 0) return;

    bulkUpdate(items, {
      onSuccess: () => {
        onClearSelection();
        setActiveAction(null);
        setNewPrice('');
      },
    });
  }, [activeAction, selectedIds, newPrice, bulkUpdate, onClearSelection]);

  const handleCloseModal = useCallback(() => {
    setActiveAction(null);
    setNewPrice('');
  }, []);

  if (selectedIds.length === 0) return null;

  return (
    <>
      {/* Floating Action Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-gray-900 text-white rounded-lg shadow-xl px-6 py-3 flex items-center gap-4">
        <span className="text-sm font-medium">
          {selectedIds.length} product{selectedIds.length !== 1 ? 's' : ''} selected
        </span>

        <div className="h-6 w-px bg-gray-700" />

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-gray-800"
            onClick={() => setActiveAction('activate')}
          >
            Activate
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-gray-800"
            onClick={() => setActiveAction('deactivate')}
          >
            Deactivate
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-gray-800"
            onClick={() => setActiveAction('updatePrice')}
          >
            Update Price
          </Button>
        </div>

        <div className="h-6 w-px bg-gray-700" />

        <button
          onClick={onClearSelection}
          className="text-gray-400 hover:text-white transition-colors"
          aria-label="Clear selection"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={activeAction !== null}
        onClose={handleCloseModal}
        title={
          activeAction === 'activate'
            ? 'Activate Products'
            : activeAction === 'deactivate'
              ? 'Deactivate Products'
              : 'Update Product Price'
        }
      >
        <div className="space-y-4">
          {activeAction === 'activate' && (
            <p className="text-gray-700">
              Are you sure you want to activate {selectedIds.length} product{selectedIds.length !== 1 ? 's' : ''}?
              This will make them visible on the storefront.
            </p>
          )}
          {activeAction === 'deactivate' && (
            <p className="text-gray-700">
              Are you sure you want to deactivate {selectedIds.length} product{selectedIds.length !== 1 ? 's' : ''}?
              This will hide them from the storefront.
            </p>
          )}
          {activeAction === 'updatePrice' && (
            <div>
              <p className="text-gray-700 mb-3">
                Set the base price for {selectedIds.length} selected product{selectedIds.length !== 1 ? 's' : ''}:
              </p>
              <label htmlFor="bulk-price" className="block text-sm font-medium text-gray-700 mb-1">
                New Base Price (₹)
              </label>
              <input
                id="bulk-price"
                type="number"
                min="0"
                step="1"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="Enter price"
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkAction}
              isLoading={isPending}
              disabled={isPending || (activeAction === 'updatePrice' && (!newPrice || isNaN(Number(newPrice))))}
              variant={activeAction === 'deactivate' ? 'danger' : 'primary'}
            >
              {isPending ? 'Updating...' : 'Confirm'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default BulkActionBar;
