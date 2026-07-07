import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import OrderCard from './components/OrderCard';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Button from '../../components/ui/Button';
import { useMyOrders, useRepurchase, useDownloadInvoice } from '../../hooks/useMyOrders';
import { ROUTES } from '../../utils/constants';

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

  if (isLoading) {
    return (
      <div className="container-page py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Orders</h1>
        <LoadingSpinner label="Loading orders..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-page py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Orders</h1>
        <EmptyState
          title="Something went wrong"
          description="Could not load your orders. Please try again."
        />
      </div>
    );
  }

  if (!data?.items?.length) {
    return (
      <div className="container-page py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Orders</h1>
        <EmptyState
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
