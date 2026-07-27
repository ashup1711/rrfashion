import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useMyOrder, useRepurchase, useDownloadInvoice, useInitiateReturn, useOrderTracking } from '../../hooks/useMyOrders';
import { getPaymentStatus, verifyPayment } from '../../api/payments';
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

const paymentStatusVariant: Record<string, 'warning' | 'info' | 'success' | 'danger'> = {
  PENDING: 'warning',
  PAID: 'success',
  FAILED: 'danger',
  REFUNDED: 'info',
  PARTIALLY_REFUNDED: 'info',
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

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 20;

const OrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: order, isLoading, error, refetch: refetchOrder } = useMyOrder(id || '');
  const repurchaseMutation = useRepurchase();
  const downloadMutation = useDownloadInvoice();
  const initiateReturnMutation = useInitiateReturn();
  const { data: tracking, isLoading: isTrackingLoading } = useOrderTracking(id || '');

  // Invoice state
  const [invoiceGenerated, setInvoiceGenerated] = useState(false);
  const [isInvoiceGenerating, setIsInvoiceGenerating] = useState(false);
  const [invoiceJustReady, setInvoiceJustReady] = useState(false);
  const invoiceCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollAttemptsRef = useRef(0);

  // Handle payment=verifying query param from Razorpay redirect
  const [searchParams, setSearchParams] = useSearchParams();
  const paymentCheckedRef = useRef(false);

  // Update local invoiceGenerated from order data
  useEffect(() => {
    if (order) {
      setInvoiceGenerated(!!order.invoiceGenerated);
    }
  }, [order]);

  // Start polling if order is PAID but invoice not yet generated (page reload scenario)
  useEffect(() => {
    if (order && order.paymentStatus === 'PAID' && !order.invoiceGenerated && !paymentCheckedRef.current) {
      startInvoicePolling();
    }
  }, [order, startInvoicePolling]);

  const clearInvoicePolling = useCallback(() => {
    if (invoiceCheckIntervalRef.current) {
      clearInterval(invoiceCheckIntervalRef.current);
      invoiceCheckIntervalRef.current = null;
    }
    pollAttemptsRef.current = 0;
  }, []);

  const startInvoicePolling = useCallback(() => {
    if (!id) return;
    clearInvoicePolling();
    setIsInvoiceGenerating(true);
    pollAttemptsRef.current = 0;

    invoiceCheckIntervalRef.current = setInterval(async () => {
      pollAttemptsRef.current += 1;
      if (pollAttemptsRef.current > MAX_POLL_ATTEMPTS) {
        clearInvoicePolling();
        setIsInvoiceGenerating(false);
        return;
      }
      try {
        const res = await getPaymentStatus(id);
        if (res.invoiceGenerated) {
          clearInvoicePolling();
          setInvoiceGenerated(true);
          setIsInvoiceGenerating(false);
          setInvoiceJustReady(true);
          toast.success('Invoice generated successfully!');
          setTimeout(() => setInvoiceJustReady(false), 4000);
          refetchOrder();
        }
      } catch {
        // keep polling
      }
    }, POLL_INTERVAL_MS);
  }, [id, clearInvoicePolling, refetchOrder]);

  useEffect(() => {
    return () => {
      clearInvoicePolling();
    };
  }, [clearInvoicePolling]);

  useEffect(() => {
    // Check for Razorpay redirect params first
    const rpOrderId = searchParams.get('razorpay_order_id');
    const rpPaymentId = searchParams.get('razorpay_payment_id');
    const rpSignature = searchParams.get('razorpay_signature');

    const paymentParam = searchParams.get('payment');
    const isVerifying = paymentParam === 'verifying' || paymentParam === 'checking';

    if ((isVerifying || (rpOrderId && rpPaymentId)) && id && !paymentCheckedRef.current) {
      paymentCheckedRef.current = true;

      const checkPayment = async () => {
        // If we have Razorpay redirect params, verify the payment
        if (rpOrderId && rpPaymentId && rpSignature) {
          try {
            const verifyResult = await verifyPayment({
              razorpayOrderId: rpOrderId,
              razorpayPaymentId: rpPaymentId,
              razorpaySignature: rpSignature,
            });
            if (verifyResult.verified) {
              toast.success('Payment confirmed!');
            }
          } catch (err) {
            // Verification failed — the webhook may have already processed it
            // Fall through to check status
          }
        }

        // Always check payment status to get current state
        try {
          const res = await getPaymentStatus(id);
          if (res.paymentStatus === 'PAID') {
            if (res.invoiceGenerated) {
              setInvoiceGenerated(true);
              toast.success('Invoice generated successfully!');
            } else {
              startInvoicePolling();
              toast.success('Payment confirmed! Generating invoice...');
            }
            if (!(rpOrderId && rpPaymentId && rpSignature)) {
              toast.success('Payment confirmed!');
            }
          } else if (res.paymentStatus === 'PENDING') {
            toast.info('Payment processing... Your order will be updated shortly.');
          } else if (res.paymentStatus === 'FAILED') {
            toast.error('Payment failed. Please try again.');
          }
        } catch {
          toast.info('Payment status check in progress...');
        }
      };

      checkPayment().finally(() => {
        // Clean up URL params
        const paramsToRemove = ['payment', 'razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature'];
        paramsToRemove.forEach(param => searchParams.delete(param));
        setSearchParams(searchParams, { replace: true });
      });
    }
  }, [id, searchParams, setSearchParams, startInvoicePolling]);

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
        <div className="flex items-center gap-2">
            <Badge variant={statusVariant[order.status] || 'default'}>{order.status}</Badge>
            {order.paymentStatus && (
              <Badge variant={paymentStatusVariant[order.paymentStatus] || 'default'}>
                {order.paymentStatus === 'PAID' ? 'Paid' :
                 order.paymentStatus === 'PENDING' ? 'Payment Pending' :
                 order.paymentStatus === 'FAILED' ? 'Payment Failed' :
                 order.paymentStatus === 'REFUNDED' ? 'Refunded' :
                 order.paymentStatus === 'PARTIALLY_REFUNDED' ? 'Partially Refunded' :
                 order.paymentStatus}
              </Badge>
            )}
          </div>
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

      {/* Invoice Section */}
      <Card className={`mb-6 ${invoiceJustReady ? 'ring-2 ring-primary-500' : ''} transition-all duration-500`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoice</h3>
        {invoiceGenerated ? (
          <div className="flex items-center gap-3">
            <div className={`flex-shrink-0 w-5 h-5 rounded-full ${invoiceJustReady ? 'bg-green-500 animate-bounce' : 'bg-green-500'} flex items-center justify-center`}>
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className={`text-sm ${invoiceJustReady ? 'text-green-700 font-medium' : 'text-gray-700'}`}>
              Invoice ready
            </span>
            <Button
              variant="outline"
              onClick={handleDownloadInvoice}
              isLoading={downloadMutation.isPending}
              className="ml-auto"
            >
              Download Invoice
            </Button>
          </div>
        ) : isInvoiceGenerating ? (
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-primary-500 animate-spin flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="text-sm text-gray-500">Generating invoice...</span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-sm text-gray-500">
              {order.paymentStatus === 'PAID' ? 'Invoice pending generation' : 'Invoice will be available after payment'}
            </span>
          </div>
        )}
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={handleRepurchase} isLoading={repurchaseMutation.isPending}>
          Buy Again
        </Button>
      </div>
    </div>
  );
};

export default OrderDetail;
