import { formatCurrency } from '../../utils/formatCurrency';
import { FREE_SHIPPING_THRESHOLD } from '../../utils/constants';

interface FreeShippingBarProps {
  total: number;
  threshold?: number;
  className?: string;
}

const FreeShippingBar = ({ total, threshold = FREE_SHIPPING_THRESHOLD, className = '' }: FreeShippingBarProps) => {
  const progress = Math.min((total / threshold) * 100, 100);
  const remaining = Math.max(threshold - total, 0);
  const earned = remaining === 0;

  return (
    <div className={`bg-neutral-light p-6 rounded-xl border border-neutral-medium ${className}`}>
      <div className="flex justify-between items-center mb-3">
        <p className="text-sm font-bold text-primary-900 uppercase tracking-wider">
          {earned
            ? 'You have earned FREE shipping!'
            : `Add ${formatCurrency(remaining)} more for FREE shipping!`}
        </p>
        <span className="text-xs font-bold text-primary-600 uppercase tracking-widest">
          {Math.round(progress)}%
        </span>
      </div>
      <div
        className="w-full h-2 bg-neutral-medium rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Free shipping progress"
      >
        <div
          className="h-full bg-primary-500 transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default FreeShippingBar;
