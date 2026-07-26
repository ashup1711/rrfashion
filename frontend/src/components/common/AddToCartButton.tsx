import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { CheckIcon } from './Icons';
import LoadingSpinner from './LoadingSpinner';

interface AddToCartButtonProps {
  variantId: string;
  label?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'accent' | 'outline';
  disabled?: boolean;
  onAddToCart: (variantId: string) => Promise<void>;
}

const sizeClasses = {
  sm: 'py-1.5 px-3 text-xs',
  md: 'py-2.5 px-4 text-sm',
  lg: 'py-3 px-6 text-base',
};

const variantClasses = {
  primary: 'bg-primary-600 hover:bg-primary-700 text-white',
  accent: 'bg-accent-500 hover:bg-accent-600 text-white',
  outline: 'border border-primary-200 text-primary-700 hover:bg-primary-50',
};

const AddToCartButton = ({
  variantId,
  label = 'Add to Cart',
  className = '',
  size = 'md',
  variant: btnVariant = 'accent',
  disabled = false,
  onAddToCart,
}: AddToCartButtonProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const successTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  const handleClick = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAdding || disabled) return;

    setIsAdding(true);
    try {
      await onAddToCart(variantId);
      setShowSuccess(true);
      toast.success('Added to cart!');
      successTimerRef.current = setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      toast.error('Failed to add to cart. Please try again.');
    } finally {
      setIsAdding(false);
    }
  }, [variantId, isAdding, disabled, onAddToCart]);

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isAdding}
      className={`
        w-full font-semibold rounded-lg transition-all duration-200
        ${sizeClasses[size]}
        ${variantClasses[btnVariant]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${isAdding ? 'cursor-wait' : ''}
        ${className}
      `}
      aria-label={showSuccess ? 'Added to cart' : label}
      aria-busy={isAdding}
    >
      {isAdding ? (
        <span className="flex items-center justify-center gap-2">
          <LoadingSpinner size="sm" />
          Adding...
        </span>
      ) : showSuccess ? (
        <span className="flex items-center justify-center gap-2">
          <CheckIcon className="w-4 h-4" />
          Added!
        </span>
      ) : (
        label
      )}
    </button>
  );
};

export default AddToCartButton;
