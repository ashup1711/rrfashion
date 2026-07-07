import { useState } from 'react';
import { toast } from 'sonner';
import DataTable from '../../../components/ui/DataTable';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Modal from '../../../components/ui/Modal';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import Card from '../../../components/ui/Card';
import {
  useInventorySummary,
  useInventoryVariantDetail,
  useCreateInventoryLock,
  useReleaseInventoryLock,
} from '../../../hooks/useInventory';
import { useStores } from '../../../hooks/useStores';
import type { Column } from '../../../components/ui/DataTable';
import type { InventoryListItem } from '../../../api/inventory';
import StockAdjustmentModal from './components/StockAdjustmentModal';

const InventoryView = () => {
  const [page, setPage] = useState(1);
  const [storeFilter, setStoreFilter] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  const { data: inventoryData, isLoading, error } = useInventorySummary({
    page,
    limit: 10,
    storeId: storeFilter || undefined,
  });

  const { data: stores } = useStores();
  const { data: variantDetail, isLoading: variantLoading } =
    useInventoryVariantDetail(selectedVariantId || '');

  const createLock = useCreateInventoryLock();
  const releaseLock = useReleaseInventoryLock();

  const [showVariantModal, setShowVariantModal] = useState(false);
  const [showLockModal, setShowLockModal] = useState(false);
  const [lockReason, setLockReason] = useState('');
  const [lockQuantity, setLockQuantity] = useState('1');
  const [lockStoreId, setLockStoreId] = useState('');
  const [saving, setSaving] = useState(false);
  const [releasingLockId, setReleasingLockId] = useState<string | null>(null);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedAdjustItem, setSelectedAdjustItem] =
    useState<InventoryListItem | null>(null);

  const columns: Column<InventoryListItem>[] = [
    {
      key: 'productName',
      header: 'Product',
      render: (item) => (
        <div>
          <p className="font-medium text-gray-900">{item.variant.product.name}</p>
          <p className="text-xs text-gray-500">SKU: {item.variant.sku}</p>
        </div>
      ),
    },
    {
      key: 'specs',
      header: 'Spec',
      render: (item) => (
        <span className="text-gray-700 text-sm">
          {item.variant.size} / {item.variant.color}
        </span>
      ),
    },
    {
      key: 'storeName',
      header: 'Store',
      render: (item) => (
        <span className="text-gray-700">{item.store.name}</span>
      ),
    },
    {
      key: 'quantityAvailable',
      header: 'Available',
      render: (item) => (
        <Badge
          variant={
            item.quantityAvailable > 10
              ? 'success'
              : item.quantityAvailable > 0
                ? 'warning'
                : 'danger'
          }
        >
          {item.quantityAvailable}
        </Badge>
      ),
    },
    {
      key: 'quantityReserved',
      header: 'Reserved',
      render: (item) => (
        <span className="text-gray-700">{item.quantityReserved}</span>
      ),
    },
    {
      key: 'quantityLocked',
      header: 'Locked',
      render: (item) => (
        <Badge variant={item.quantityLocked > 0 ? 'warning' : 'default'}>
          {item.quantityLocked}
        </Badge>
      ),
    },
    {
      key: 'quantitySold',
      header: 'Sold',
      render: (item) => (
        <span className="text-gray-700">{item.quantitySold}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedVariantId(item.variantId);
              setShowVariantModal(true);
            }}
          >
            View Detail
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedVariantId(item.variantId);
              setLockStoreId(item.storeId);
              setShowLockModal(true);
            }}
          >
            Lock
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedAdjustItem(item);
              setShowAdjustModal(true);
            }}
          >
            Adjust Stock
          </Button>
        </div>
      ),
    },
  ];

  const handleCreateLock = async () => {
    if (!selectedVariantId) return;
    if (!lockStoreId) {
      toast.error('Please select a store');
      return;
    }
    const qty = parseInt(lockQuantity, 10);
    if (isNaN(qty) || qty < 1) {
      toast.error('Please enter a valid quantity');
      return;
    }

    // Validate against available stock at selected store
    const summary = variantDetail?.summary?.find(s => s.storeId === lockStoreId);
    const maxAvail = summary ? summary.quantityAvailable - summary.quantityLocked : 0;
    if (qty > maxAvail) {
      toast.error(`Cannot lock ${qty} items. Only ${maxAvail} items available at this store.`);
      return;
    }

    setSaving(true);
    try {
      await createLock.mutateAsync({
        variantId: selectedVariantId,
        storeId: lockStoreId,
        reason: lockReason || undefined,
        quantity: qty,
      });
      setShowLockModal(false);
      setLockReason('');
      setLockQuantity('1');
      setLockStoreId('');
      toast.success('Lock created successfully');
    } catch {
      toast.error('Failed to create lock');
    } finally {
      setSaving(false);
    }
  };

  const handleReleaseLock = async (lockId: string) => {
    if (!window.confirm('Release this lock?')) return;
    setReleasingLockId(lockId);
    try {
      await releaseLock.mutateAsync(lockId);
      toast.success('Lock released successfully');
    } catch {
      toast.error('Failed to release lock');
    } finally {
      setReleasingLockId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="mt-1 text-sm text-gray-600">
            Track stock across stores
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-6">
        <select
          value={storeFilter}
          onChange={(e) => {
            setStoreFilter(e.target.value);
            setPage(1);
          }}
          className="block w-48 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          aria-label="Filter by store"
        >
          <option value="">All Stores</option>
          {stores?.map((store) => (
            <option key={store.id} value={store.id}>
              {store.name}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={inventoryData?.items || []}
        keyExtractor={(item) => `${item.variantId}-${item.storeId}`}
        isLoading={isLoading}
        error={error as Error | null}
        emptyTitle="No inventory data found"
        emptyDescription={
          storeFilter
            ? 'No stock found for this store'
            : 'No products with inventory tracking'
        }
        pagination={
          inventoryData?.meta
            ? {
                page: inventoryData.meta.page,
                limit: inventoryData.meta.limit,
                total: inventoryData.meta.total,
                totalPages: inventoryData.meta.totalPages,
                onPageChange: setPage,
              }
            : undefined
        }
      />

      {/* Variant Detail Modal */}
      <Modal
        isOpen={showVariantModal}
        onClose={() => {
          setShowVariantModal(false);
          setSelectedVariantId(null);
        }}
        title="Variant Stock Detail"
      >
        {variantLoading ? (
          <LoadingSpinner size="md" />
        ) : variantDetail ? (
          <div className="space-y-4">
            {/* Variant Info */}
            <div className="bg-gray-50 p-3 rounded-md mb-4">
              <div className="flex gap-4 text-xs text-gray-600">
                <span>SKU: {variantDetail.variant.sku}</span>
                <span>Size: {variantDetail.variant.size}</span>
                <span>Color: {variantDetail.variant.color}</span>
              </div>
            </div>

            {/* Summary section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                Stock Summary
              </h3>
              <div className="grid grid-cols-4 gap-3">
                {variantDetail.summary.map((s) => (
                  <Card key={`${s.variantId}-${s.storeId}`} padding={false}>
                    <div className="p-3">
                      <p className="text-xs text-gray-500">
                        {s.store?.name || 'Unknown Store'}
                      </p>
                      <div className="mt-1 flex justify-between text-sm">
                        <span className="text-green-600 font-medium">
                          {s.quantityAvailable} avail
                        </span>
                        <span className="text-yellow-600">
                          {s.quantityReserved} res
                        </span>
                        <span className="text-orange-600">
                          {s.quantityLocked} locked
                        </span>
                        <span className="text-gray-600">
                          {s.quantitySold} sold
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Active locks */}
            {variantDetail.activeLocks.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">
                  Active Locks
                </h3>
                <div className="space-y-2">
                  {variantDetail.activeLocks.map((lock) => (
                    <div
                      key={lock.id}
                      className="flex items-center justify-between p-2 bg-yellow-50 border border-yellow-200 rounded-md"
                    >
                      <div>
                        <p className="text-xs font-medium text-gray-900">
                          Size: {lock.variant?.size} | Color: {lock.variant?.color} | Qty: {lock.quantity}
                        </p>
                        <p className="text-xs text-gray-700">
                          Reason: {lock.reason || 'Not specified'}
                        </p>
                        <p className="text-xs text-gray-500">
                          Store: {lock.store?.name} | Expires: {new Date(lock.expiresAt).toLocaleString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReleaseLock(lock.id)}
                        className="text-red-600"
                        isLoading={releasingLockId === lock.id}
                        disabled={releasingLockId !== null && releasingLockId !== lock.id}
                      >
                        Release
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Units */}
            {variantDetail.units.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">
                  Individual Units
                </h3>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {variantDetail.units.map((unit) => (
                    <div
                      key={unit.id}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                    >
                      <span className="text-gray-700 font-mono text-xs">
                        {unit.id.slice(0, 8)}...
                      </span>
                      <Badge
                        variant={
                          unit.status === 'available'
                            ? 'success'
                            : unit.status === 'reserved'
                              ? 'warning'
                              : unit.status === 'rented_out' || unit.status === 'sold'
                                ? 'danger'
                                : 'default'
                        }
                      >
                        {unit.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Create Lock Button */}
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => setShowLockModal(true)}
              >
                + Create Lock
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No detail available</p>
        )}
      </Modal>

      {/* Create Lock Modal */}
      <Modal
        isOpen={showLockModal}
        onClose={() => {
          setShowLockModal(false);
          setLockReason('');
          setLockQuantity('1');
          setLockStoreId('');
        }}
        title="Create Inventory Lock"
      >
        <p className="text-sm text-gray-600 mb-4">
          This will create a 24-hour lock on this variant's inventory.
        </p>
        <div className="space-y-4">
          {variantLoading ? (
            <div className="flex justify-center py-4">
              <LoadingSpinner size="sm" />
            </div>
          ) : (
            <>
              {/* Variant being locked */}
              {variantDetail && (
                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-md mb-2">
                  <div className="flex gap-4 text-xs text-gray-600">
                    <span>Size: {variantDetail.variant.size}</span>
                    <span>Color: {variantDetail.variant.color}</span>
                    <span>SKU: {variantDetail.variant.sku}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Store
                </label>
                <select
                  value={lockStoreId}
                  onChange={(e) => setLockStoreId(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select a store</option>
                  {stores?.map((store) => {
                    const summary = variantDetail?.summary?.find(s => s.storeId === store.id);
                    const available = summary ? summary.quantityAvailable - summary.quantityLocked : 0;
                    return (
                      <option key={store.id} value={store.id}>
                        {store.name} ({available} avail, {summary?.quantityLocked || 0} locked)
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity to Lock
                </label>
                <input
                  type="number"
                  min="1"
                  value={lockQuantity}
                  onChange={(e) => setLockQuantity(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter quantity"
                />
                {lockStoreId && variantDetail && (
                  (() => {
                    const summary = variantDetail.summary.find(s => s.storeId === lockStoreId);
                    const maxAvail = summary ? summary.quantityAvailable - summary.quantityLocked : 0;
                    return (
                      <p className="text-xs text-gray-500 -mt-2">
                        Max available at this store: {maxAvail} items
                      </p>
                    );
                  })()
                )}
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason (optional)
            </label>
            <textarea
              value={lockReason}
              onChange={(e) => setLockReason(e.target.value)}
              rows={2}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="e.g. Customer trying in store"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowLockModal(false);
                setLockReason('');
                setLockQuantity('1');
                setLockStoreId('');
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateLock} isLoading={saving}>
              Create Lock
            </Button>
          </div>
        </div>
      </Modal>

      {/* Stock Adjustment Modal */}
      <StockAdjustmentModal
        isOpen={showAdjustModal}
        onClose={() => {
          setShowAdjustModal(false);
          setSelectedAdjustItem(null);
        }}
        item={selectedAdjustItem}
        storeFilter={storeFilter}
        stores={stores || []}
      />
    </div>
  );
};

export default InventoryView;
