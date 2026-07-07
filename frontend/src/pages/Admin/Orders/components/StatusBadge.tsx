import Badge from '../../../../components/ui/Badge';

interface StatusBadgeProps {
  status: string;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' }> = {
  PENDING: { label: 'Pending', variant: 'warning' },
  CONFIRMED: { label: 'Confirmed', variant: 'info' },
  PACKED: { label: 'Packed', variant: 'info' },
  SHIPPED: { label: 'Shipped', variant: 'info' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', variant: 'warning' },
  DELIVERED: { label: 'Delivered', variant: 'success' },
  CANCELLED: { label: 'Cancelled', variant: 'danger' },
  RETURNED: { label: 'Returned', variant: 'default' },
};

const StatusBadge = ({ status }: StatusBadgeProps) => {
  const config = statusConfig[status] || { label: status, variant: 'default' as const };

  return <Badge variant={config.variant}>{config.label}</Badge>;
};

export default StatusBadge;
