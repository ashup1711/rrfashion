import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import OrderCard from './components/OrderCard';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Button from '../../components/ui/Button';
import { useMyOrders, useRepurchase, useDownloadInvoice } from '../../hooks/useMyOrders';
import { ROUTES } from '../../utils/constants';

// REQ-FE-004: Skeleton loading component for better perceived performance
const OrderCardSkeleton = () => (
  <div className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse">
    <div className="flex items-center justify-between mb-4">
      <div>
        <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
        <div className="h-3 bg-gray-200 rounded w-48" />
      </div>
      <div className="h-6 bg-gray-200 rounded-full w-20" />
    </div>
    <div className="space-y-3">
      {[1, 2].map((i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gray-200 rounded flex-shrink-0" />
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
          <div className="h-4 bg-gray-200 rounded w-16" />
        </div>
      ))}
    </div>
    <div className="border-t border-gray-200 mt-4 pt-4 flex items-center justify-between">
      <div className="h-4 bg-gray-200 rounded w-24" />
      <div className="h-8 bg-gray-200 rounded w-20" />
    </div>
  </div>
);

const Orders = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading, error } = useMyOrders({ page, limit });
  const repurchaseMutation = useRepurchase();
  const downloadMutation = useDownloadInvoice();

  const handleRepurchase = async (orderId: string) => {
    try {
      await repurchaseMutation.mutateAsync(orderId);
      navigate(ROUTES.CART);
    } catch (err) {
      toast.error('Failed to repurchase. Some items may be unavailable.');
    }
  };

  const handleDownloadInvoice = async (orderId: string) => {
    try {
      const blob = await downloadMutation.mutateAsync(orderId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${orderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      toast.error('Failed to download invoice. Please try again.');
    }
  };

  // REQ-FE-004: Use skeleton loading instead of generic spinner
  if (isLoading) {
    return (
      <div className="container-page py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Orders</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <OrderCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // REQ-FE-004: Improved error state with retry button
  if (error) {
    return (
      <div className="container-page py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Orders</h1>
        <EmptyState
          iconType="orders"
          title="Something went wrong"
          description="Could not load your orders. Please try again."
          action={
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          }
        />
      </div>
    );
  }

  if (!data?.items?.length) {
    return (
      <div className="container-page py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Orders</h1>
        <EmptyState
          iconType="orders"
          title="No orders yet"
          description="You haven't placed any orders yet. Start shopping to see your orders here."
          action={
            <Button onClick={() => navigate(ROUTES.SHOP)}>Start Shopping</Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="container-page py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My Orders</h1>

      <div className="space-y-4">
        {data.items.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            onRepurchase={handleRepurchase}
            onDownloadInvoice={handleDownloadInvoice}
          />
        ))}
      </div>

      {data.meta && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-gray-600">
            Page {data.meta.page} of {data.meta.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= data.meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

export default Orders;
