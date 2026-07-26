import type { ReactNode } from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'card' | 'product-detail';
  width?: string | number;
  height?: string | number;
  count?: number;
  children?: ReactNode;
}

const baseClass = 'bg-primary-100 animate-pulse rounded';

const Skeleton = ({
  className = '',
  variant = 'text',
  width,
  height,
  count = 1,
}: SkeletonProps) => {
  const defaultStyles: Record<string, string> = {
    text: 'h-4 w-full rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
    card: 'h-80 w-full rounded-lg',
    'product-detail': 'h-96 w-full rounded-lg',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  const items = Array.from({ length: count }, (_, i) => (
    <div
      key={i}
      className={`${baseClass} ${defaultStyles[variant] || defaultStyles.text} ${className}`}
      style={style}
      aria-hidden="true"
    />
  ));

  return <>{items}</>;
};

// Pre-composed skeleton layouts

const ProductCardSkeleton = () => (
  <div className="rounded-xl border border-neutral-medium/30 shadow-md overflow-hidden bg-white">
    <div className="aspect-[3/4] bg-primary-50 animate-pulse" />
    <div className="px-card-padding py-4 space-y-3">
      <div className="h-3 w-1/3 bg-primary-100 rounded animate-pulse" />
      <div className="h-4 w-4/5 bg-primary-100 rounded animate-pulse" />
      <div className="h-5 w-1/2 bg-primary-100 rounded animate-pulse" />
      <div className="flex gap-1">
        <div className="w-6 h-6 rounded-full bg-primary-100 animate-pulse" />
        <div className="w-6 h-6 rounded-full bg-primary-100 animate-pulse" />
        <div className="w-6 h-6 rounded-full bg-primary-100 animate-pulse" />
      </div>
      <div className="h-10 w-full bg-primary-100 rounded-lg animate-pulse" />
    </div>
  </div>
);

const ProductDetailSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
    <Skeleton variant="product-detail" />
    <div className="space-y-4">
      <Skeleton variant="text" width="80%" height={32} />
      <Skeleton variant="text" width="40%" height={24} />
      <Skeleton variant="text" count={4} />
      <Skeleton variant="rectangular" width="100%" height={48} />
    </div>
  </div>
);

const CartSkeleton = () => (
  <div className="space-y-4">
    {[1, 2, 3].map((i) => (
      <div key={i} className="flex gap-4 p-4 border rounded-lg">
        <Skeleton variant="rectangular" width={100} height={100} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" width="30%" />
          <Skeleton variant="text" width="20%" />
        </div>
      </div>
    ))}
  </div>
);

const CheckoutSkeleton = () => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
    <div className="space-y-4">
      <Skeleton variant="text" width="40%" height={24} />
      <Skeleton variant="rectangular" count={3} height={48} />
    </div>
    <div className="space-y-4">
      <Skeleton variant="text" width="40%" height={24} />
      <Skeleton variant="card" />
    </div>
  </div>
);

const OrderListSkeleton = () => (
  <div className="space-y-4">
    {[1, 2].map((i) => (
      <div key={i} className="border rounded-lg p-6">
        <div className="flex justify-between mb-4">
          <Skeleton variant="text" width="30%" />
          <Skeleton variant="text" width="20%" />
        </div>
        <div className="flex gap-4">
          <Skeleton variant="rectangular" width={80} height={80} />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" width="50%" />
            <Skeleton variant="text" width="30%" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

export default Skeleton;
export {
  ProductCardSkeleton,
  ProductDetailSkeleton,
  CartSkeleton,
  CheckoutSkeleton,
  OrderListSkeleton,
};
