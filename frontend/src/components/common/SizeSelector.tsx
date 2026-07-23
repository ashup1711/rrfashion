import { forwardRef } from 'react';
import { motion } from 'framer-motion';

export interface ProductSize {
  size: string;
  variantId: string;
  stock?: number;
}

interface SizeSelectorProps {
  sizes: ProductSize[];
  selectedSize: string | null;
  disabled?: boolean;
  onSizeSelect: (size: ProductSize) => void;
  className?: string;
}

export const SizeSelector = forwardRef<HTMLDivElement, SizeSelectorProps>(
  ({ sizes, selectedSize, disabled, onSizeSelect, className = '' }, ref) => {
    return (
      <div 
        ref={ref} 
        className={className}
        role="radiogroup"
        aria-label="Size options"
      >
        <div className="flex flex-wrap gap-2">
          {sizes.map((size) => {
            const isSelected = selectedSize === size.variantId;
            const isDisabled = disabled || (size.stock !== undefined && size.stock <= 0);
            
            return (
              <motion.button
                key={size.variantId}
                type="button"
                onClick={() => !isDisabled && onSizeSelect(size)}
                whileTap={{ scale: isDisabled ? 1 : 0.95 }}
                whileHover={{ scale: isDisabled ? 1 : 1.02 }}
                className={`
                  px-3 py-2 text-sm font-medium border rounded-lg transition-all duration-200
                  min-w-[44px] min-h-[44px] touch-manipulation
                  ${isSelected 
                    ? 'bg-primary-900 text-white border-primary-900 shadow-sm' 
                    : 'bg-white text-gray-900 border-gray-300 hover:border-gray-900'}
                  ${isDisabled 
                    ? 'opacity-50 cursor-not-allowed bg-gray-100 border-gray-200' 
                    : 'cursor-pointer'}
                `}
                aria-disabled={isDisabled}
                aria-pressed={isSelected}
                aria-label={`Size ${size.size}${isDisabled ? ' - Out of stock' : ''}`}
              >
                <span className="font-semibold">{size.size}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
    );
  }
);

SizeSelector.displayName = 'SizeSelector';

export default SizeSelector;
