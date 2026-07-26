import { HeartIcon, HeartFilledIcon, EyeIcon, CompareIcon } from './Icons';

interface QuickActionsProps {
  isWishlisted: boolean;
  onToggleWishlist: (e: React.MouseEvent) => void;
  onQuickView: (e: React.MouseEvent) => void;
  onCompare: (e: React.MouseEvent) => void;
  isVisible: boolean;
  variant?: 'standard' | 'compact';
}

const QuickActions = ({
  isWishlisted,
  onToggleWishlist,
  onQuickView,
  onCompare,
  isVisible,
  variant = 'standard',
}: QuickActionsProps) => {
  const baseButtonClasses = 
    'w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm shadow-sm flex items-center justify-center transition-all duration-200 hover:bg-white hover:shadow-md hover:scale-105';

  return (
    <div className={`absolute left-0 right-0 bottom-0 z-20 flex items-center justify-center gap-2 px-4 py-3 transition-all duration-300 ${
      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full md:opacity-0 md:translate-y-full'
    }`}>
      {/* Wishlist Button */}
      <button
        onClick={onToggleWishlist}
        className={baseButtonClasses}
        aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
      >
        {isWishlisted ? (
          <HeartFilledIcon className="text-red-500" size={16} />
        ) : (
          <HeartIcon className="text-neutral-dark" size={16} />
        )}
      </button>

      {/* Quick View Button - only in standard variant */}
      {variant === 'standard' && (
        <button
          onClick={onQuickView}
          className={baseButtonClasses}
          aria-label="Quick view"
        >
          <EyeIcon className="text-neutral-dark" size={16} />
        </button>
      )}

      {/* Compare Button - only in standard variant */}
      {variant === 'standard' && (
        <button
          onClick={onCompare}
          className={baseButtonClasses}
          aria-label="Add to compare"
        >
          <CompareIcon className="text-neutral-dark" size={16} />
        </button>
      )}
    </div>
  );
};

export default QuickActions;
