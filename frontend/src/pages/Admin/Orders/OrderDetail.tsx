import { useParams, Link } from 'react-router-dom';
import { useAdminOrder, useOrderStatusLogs, useUpdateOrderStatus } from '../../../hooks/useAdminOrders';
import StatusBadge from './components/StatusBadge';
import StatusUpdateModal from './components/StatusUpdateModal';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import EmptyState from '../../../components/common/EmptyState';
import ErrorBoundary from '../../../components/common/ErrorBoundary';
import Button from '../../../components/ui/Button';
import { ROUTES } from '../../../utils/constants';
import { useState } from 'react';

const OrderDetailContent = () => {
  const { id } = useParams<{ id: string }>();
  const [showStatusModal, setShowStatusModal] = useState(false);

  const { data: order, isLoading: orderLoading, error: orderError } = useAdminOrder(id || '');
  const { data: statusLogs, isLoading: logsLoading } = useOrderStatusLogs(id || '');
  const updateStatusMutation = useUpdateOrderStatus();

  if (orderLoading) {
    return (
      <div className="container-page py-8">
        <LoadingSpinner label="Loading order details..." />
      </div>
    );
  }

  if (orderError || !order) {
    return (
      <div className="container-page py-8">
        <EmptyState
          title="Could not load order"
          description={orderError instanceof Error ? orderError.message : 'Order not found'}
          action={
            <Link to={ROUTES.ADMIN_ORDERS}>
              <Button variant="outline">Back to Orders</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const handleStatusUpdate = (status: string, note?: string) => {
    updateStatusMutation.mutate(
      { id: order.id, status, note },
      { onSuccess: () => setShowStatusModal(false) },
    );
  };

  const canUpdateStatus =
    order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && order.status !== 'RETURNED';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to={ROUTES.ADMIN_ORDERS}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Back to orders"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                Order #{order.orderNumber}
              </h1>
              <StatusBadge status={order.status} />
            </div>
            <p className="text-sm text-gray-500">
              Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>

        {canUpdateStatus && (
          <Button onClick={() => setShowStatusModal(true)}>
            Update Status
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Info</h2>
            {order.user ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Name:</span>{' '}
                  {order.user.firstName} {order.user.lastName}
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Email:</span>{' '}
                  {order.user.email}
                </p>
                {order.user.phone && (
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Phone:</span>{' '}
                    {order.user.phone}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Guest user</p>
            )}
          </div>

          {/* Shipping Address */}
          {order.shippingAddress && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Shipping Address</h2>
              <div className="space-y-1 text-sm text-gray-700">
                <p className="font-medium">{order.shippingAddress.name}</p>
                <p>{order.shippingAddress.phone}</p>
                <p>{order.shippingAddress.line1}</p>
                {order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}
                <p>
                  {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                  {order.shippingAddress.pincode}
                </p>
              </div>
            </div>
          )}

          {/* Payment Info */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Info</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Method</span>
                <span className="font-medium text-gray-900">
                  {order.payment?.method || '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status</span>
                <span className="font-medium text-gray-900">
                  {order.paymentStatus || order.payment?.status || '—'}
                </span>
              </div>
              <hr className="my-2" />
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="text-gray-900">₹{order.subtotal?.toLocaleString() ?? '0'}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Discount</span>
                  <span className="text-green-600">-₹{order.discountAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span className="text-gray-900">₹{order.shippingCharge?.toLocaleString() ?? '0'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax</span>
                <span className="text-gray-900">₹{order.taxAmount?.toLocaleString() ?? '0'}</span>
              </div>
              <hr className="my-2" />
              <div className="flex justify-between text-base">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="font-bold text-gray-900">₹{order.totalAmount?.toLocaleString() ?? '0'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Order Items & Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Order Items ({order.items?.length || 0})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Product</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Variant</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Qty</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Price</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {order.items?.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
                            {item.product?.images?.[0] ? (
                              <img
                                src={item.product.images[0]}
                                alt={item.product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                                N/A
                              </div>
                            )}
                          </div>
                          <span className="font-medium text-gray-900 truncate max-w-[180px]">
                            {item.product?.name || 'Product'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {item.variant?.size || item.variant?.color
                          ? [item.variant.color, item.variant.size].filter(Boolean).join(' / ')
                          : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {item.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        ₹{item.unitPrice?.toLocaleString() ?? '0'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ₹{item.totalPrice?.toLocaleString() ?? '0'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Status Timeline */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Status Timeline</h2>
            {logsLoading ? (
              <LoadingSpinner size="sm" label="Loading timeline..." />
            ) : !statusLogs || statusLogs.length === 0 ? (
              <p className="text-sm text-gray-500">No status history available.</p>
            ) : (
              <div className="flow-root">
                <ul className="-mb-8" role="list">
                  {statusLogs.map((log, index) => (
                    <li key={log.id}>
                      <div className="relative pb-8">
                        {index < statusLogs.length - 1 && (
                          <span
                            className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                            aria-hidden="true"
                          />
                        )}
                        <div className="relative flex gap-3">
                          <div>
                            <span
                              className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white text-xs font-bold ${
                                index === statusLogs.length - 1
                                  ? 'bg-primary-100 text-primary-700'
                                  : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              {index + 1}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0 pt-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-gray-900">
                                {log.fromStatus || '—'}
                              </span>
                              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              <StatusBadge status={log.toStatus} />
                              <span className="text-xs text-gray-400">
                                by {log.changedByUser ? `${log.changedByUser.firstName} ${log.changedByUser.lastName}` : log.changedBy || 'System'}
                              </span>
                            </div>
                            {log.note && (
                              <p className="mt-1 text-sm text-gray-600">{log.note}</p>
                            )}
                            <p className="mt-0.5 text-xs text-gray-400">
                              {new Date(log.createdAt).toLocaleString('en-IN')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Update Modal */}
      {showStatusModal && (
        <StatusUpdateModal
          isOpen={showStatusModal}
          onClose={() => setShowStatusModal(false)}
          currentStatus={order.status}
          onConfirm={handleStatusUpdate}
          isUpdating={updateStatusMutation.isPending}
        />
      )}
    </div>
  );
};

const OrderDetail = () => {
  return (
    <ErrorBoundary>
      <OrderDetailContent />
    </ErrorBoundary>
  );
};

export default OrderDetail;
