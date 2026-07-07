import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useMyOrder, useRepurchase, useDownloadInvoice, useInitiateReturn, useOrderTracking } from '../../hooks/useMyOrders';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Select from '../../components/ui/Select';
import { formatCurrency } from '../../utils/formatCurrency';
import { ROUTES } from '../../utils/constants';

const statusVariant: Record<string, 'warning' | 'info' | 'success' | 'danger'> = {
  PENDING: 'warning',
  CONFIRMED: 'info',
  PACKED: 'info',
  SHIPPED: 'info',
  OUT_FOR_DELIVERY: 'warning',
  DELIVERED: 'success',
  CANCELLED: 'danger',
  PARTIALLY_CANCELLED: 'danger',
  RETURNED: 'warning',
};

const RETURN_REASONS = [
  { value: 'size_issue', label: 'Size issue' },
  { value: 'damaged', label: 'Damaged or defective' },
  { value: 'not_as_described', label: 'Not as described' },
  { value: 'wrong_item', label: 'Wrong item delivered' },
  { value: 'quality_issue', label: 'Quality issue' },
  { value: 'other', label: 'Other' },
];

const trackingSteps = [
  { key: 'SHIPPED', label: 'Shipped' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
  { key: 'DELIVERED', label: 'Delivered' },
];

const OrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: order, isLoading, error } = useMyOrder(id || '');
  const repurchaseMutation = useRepurchase();
  const downloadMutation = useDownloadInvoice();
  const initiateReturnMutation = useInitiateReturn();
  const { data: tracking, isLoading: isTrackingLoading } = useOrderTracking(id || '');

  // Return form state
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [returnItemIds, setReturnItemIds] = useState<string[]>([]);
  const [returnReason, setReturnReason] = useState('');
  const [returnRemarks, setReturnRemarks] = useState('');

  const handleDownloadInvoice = async () => {
    if (!id) return;
    try {
      const blob = await downloadMutation.mutateAsync(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${order?.orderNumber || id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      toast.error('Failed to download invoice. Please try again.');
    }
  };

  const handleRepurchase = async () => {
    if (!id) return;
    try {
      await repurchaseMutation.mutateAsync(id);
      navigate(ROUTES.CART);
    } catch (err) {
      toast.error('Failed to repurchase. Some items may be unavailable.');
    }
  };

  const handleReturnItemToggle = (itemId: string) => {
    setReturnItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((i) => i !== itemId) : [...prev, itemId],
    );
  };

  const handleInitiateReturn = async () => {
    if (!id) return;
    if (returnItemIds.length === 0) {
      toast.error('Please select at least one item to return.');
      return;
    }
    if (!returnReason) {
      toast.error('Please select a return reason.');
      return;
    }
    try {
      await initiateReturnMutation.mutateAsync({
        orderId: id,
        data: {
          reason: returnReason,
          itemIds: returnItemIds,
          remarks: returnRemarks || undefined,
        },
      });
      setShowReturnForm(false);
      setReturnItemIds([]);
      setReturnReason('');
      setReturnRemarks('');
    } catch {
      // Error toast handled by the mutation
    }
  };

  if (isLoading) {
    return (
      <div className="container-page py-8">
        <LoadingSpinner label="Loading order details..." />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container-page py-8">
        <EmptyState
          title="Order not found"
          description="Could not find this order. It may have been removed or you may not have access."
          action={
            <Link to={ROUTES.ORDERS}>
              <Button variant="outline">Back to Orders</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const isDelivered = order.status === 'DELIVERED';
  const currentTrackingStep = trackingSteps.findIndex((s) => s.key === tracking?.status);

  return (
    <div className="container-page py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to={ROUTES.ORDERS} className="text-sm text-primary-600 hover:text-primary-700 mb-2 inline-block">
            &larr; Back to Orders
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Order {order.orderNumber}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Badge variant={statusVariant[order.status] || 'default'}>{order.status}</Badge>
      </div>

      {/* Order Tracking Section (Item D) */}
      {tracking && !isTrackingLoading && (
        <Card className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tracking</h3>
          <div className="mb-4 p-4 bg-gray-50 rounded-md">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Courier:</span>
                <p className="font-medium text-gray-900">{tracking.courierName}</p>
              </div>
              <div>
                <span className="text-gray-500">AWB Number:</span>
                <p className="font-medium text-gray-900">{tracking.awbNumber}</p>
              </div>
              {tracking.trackingUrl && (
                <div className="flex items-end">
                  <a
                    href={tracking.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                  >
                    Track on Courier Site &rarr;
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="relative">
            {trackingSteps.map((step, idx) => {
              const isCompleted = idx <= currentTrackingStep;
              const isCurrent = idx === currentTrackingStep;
              return (
                <div key={step.key} className="flex items-start gap-3 pb-6 last:pb-0">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                        isCompleted
                          ? 'bg-primary-600 border-primary-600'
                          : 'bg-white border-gray-300'
                      }`}
                    />
                    {idx < trackingSteps.length - 1 && (
                      <div
                        className={`w-0.5 h-8 ${
                          idx < currentTrackingStep ? 'bg-primary-600' : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </div>
                  <div className="pt-0.5">
                    <p
                      className={`text-sm font-medium ${
                        isCurrent
                          ? 'text-primary-700'
                          : isCompleted
                            ? 'text-gray-900'
                            : 'text-gray-400'
                      }`}
                    >
                      {step.label}
                      {isCurrent && ' (Current)'}
                    </p>
                    {isCompleted && step.key === 'SHIPPED' && tracking.shippedAt && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(tracking.shippedAt).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    )}
                    {isCompleted && step.key === 'DELIVERED' && tracking.deliveredAt && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(tracking.deliveredAt).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Items */}
      <Card className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Items ({order.itemCount ?? order.items.length})
        </h3>
        <div className="divide-y divide-gray-200">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
              <div className="w-16 h-16 bg-gray-100 rounded flex-shrink-0 overflow-hidden">
                <img
                  src={item.product?.images?.[0] || '/images/placeholder.svg'}
                  alt={item.product?.name ?? 'Product'}
                  className="w-full h-full object-cover"
                />
              </div>
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
                  Qty: {item.quantity} &times; {formatCurrency(item.unitPrice)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {formatCurrency(item.totalPrice)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Order Summary */}
      <Card className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Subtotal</span>
            <span className="text-gray-900">{formatCurrency(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Shipping</span>
            <span className="text-green-600">{order.shippingCharge === 0 ? 'Free' : formatCurrency(order.shippingCharge)}</span>
          </div>
          {order.discountAmount > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Discount</span>
              <span className="text-green-600">-{formatCurrency(order.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600">Tax</span>
            <span className="text-gray-900">{formatCurrency(order.taxAmount)}</span>
          </div>
          <div className="border-t border-gray-200 pt-2 flex justify-between">
            <span className="text-base font-semibold text-gray-900">Total</span>
            <span className="text-base font-semibold text-gray-900">{formatCurrency(order.totalAmount)}</span>
          </div>
        </div>
      </Card>

      {/* Return Section (Item C) — only for DELIVERED orders */}
      {isDelivered && !showReturnForm && (
        <div className="mb-6">
          <Button variant="outline" onClick={() => setShowReturnForm(true)}>
            Return Items
          </Button>
          <p className="text-xs text-gray-500 mt-2">
            You can initiate a return within the return window. Items must be unused and in original packaging.
          </p>
        </div>
      )}

      {isDelivered && showReturnForm && (
        <Card className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Initiate Return</h3>

          {/* Item Selection */}
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Select items to return:</p>
            <div className="space-y-2">
              {order.items.map((item) => (
                <label
                  key={item.id}
                  className="flex items-center gap-3 p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={returnItemIds.includes(item.id)}
                    onChange={() => handleReturnItemToggle(item.id)}
                    className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
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
                  </div>
                  <p className="text-sm text-gray-900">{formatCurrency(item.totalPrice)}</p>
                </label>
              ))}
            </div>
          </div>

          {/* Reason Dropdown */}
          <div className="mb-4">
            <Select
              label="Return Reason"
              placeholder="Select a reason"
              options={RETURN_REASONS}
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
            />
          </div>

          {/* Remarks Textarea */}
          <div className="mb-4">
            <label htmlFor="return-remarks" className="block text-sm font-medium text-gray-700 mb-1">
              Additional Remarks (Optional)
            </label>
            <textarea
              id="return-remarks"
              rows={3}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Describe the issue..."
              value={returnRemarks}
              onChange={(e) => setReturnRemarks(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={handleInitiateReturn}
              isLoading={initiateReturnMutation.isPending}
              disabled={returnItemIds.length === 0 || !returnReason}
            >
              Submit Return Request
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowReturnForm(false);
                setReturnItemIds([]);
                setReturnReason('');
                setReturnRemarks('');
              }}
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={handleRepurchase} isLoading={repurchaseMutation.isPending}>
          Buy Again
        </Button>
        <Button
          variant="outline"
          onClick={handleDownloadInvoice}
          isLoading={downloadMutation.isPending}
        >
          Download Invoice
        </Button>
      </div>
    </div>
  );
};

export default OrderDetail;
