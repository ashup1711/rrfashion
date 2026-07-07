import { useNavigate } from 'react-router-dom';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import { formatCurrency } from '../../../utils/formatCurrency';
import { ROUTES } from '../../../utils/constants';
import type { Order } from '../../../types/order';

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

interface OrderCardProps {
  order: Order;
  onRepurchase?: (orderId: string) => void;
  onDownloadInvoice?: (orderId: string) => void;
}

const OrderCard = ({ order, onRepurchase, onDownloadInvoice }: OrderCardProps) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-gray-500">Order #{order.orderNumber}</p>
          <p className="text-xs text-gray-400">
            Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          {order.itemCount != null && (
            <p className="text-xs text-gray-400 mt-0.5">{order.itemCount} item{order.itemCount !== 1 ? 's' : ''}</p>
          )}
        </div>
        <Badge variant={statusVariant[order.status] || 'default'}>{order.status}</Badge>
      </div>

      <div className="space-y-3">
        {order.items.slice(0, 3).map((item) => (
          <div key={item.id} className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gray-100 rounded flex-shrink-0 overflow-hidden">
              <img
                src={item.product?.images?.[0] || '/images/placeholder.svg'}
                alt={item.product?.name ?? 'Product'}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
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
            <p className="text-sm font-medium text-gray-900">{formatCurrency(item.totalPrice)}</p>
          </div>
        ))}
        {order.items.length > 3 && (
          <p className="text-xs text-gray-400 text-center">
            +{order.items.length - 3} more item{order.items.length - 3 !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      <div className="border-t border-gray-200 mt-4 pt-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900">
          Total: {formatCurrency(order.totalAmount)}
        </p>
        <div className="flex items-center gap-2">
          {onDownloadInvoice && (
            <Button variant="ghost" size="sm" onClick={() => onDownloadInvoice(order.id)}>
              Invoice
            </Button>
          )}
          {onRepurchase && order.status === 'DELIVERED' && (
            <Button variant="outline" size="sm" onClick={() => onRepurchase(order.id)}>
              Buy Again
            </Button>
          )}
          <Button size="sm" onClick={() => navigate(ROUTES.ORDER_DETAIL(order.id))}>
            View Details
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OrderCard;
