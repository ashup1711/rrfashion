import { AnimatePresence, motion } from 'framer-motion';
import { useState, useCallback } from 'react';

interface EnhancedAddToCartButtonProps {
  onClick: () => Promise<void> | void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}

export const EnhancedAddToCartButton = ({
  onClick,
  disabled,
  children,
  className = '',
  ariaLabel,
}: EnhancedAddToCartButtonProps) => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  const handleClick = useCallback(async () => {
    if (disabled || status !== 'idle') return;
    
    setStatus('loading');
    try {
      await onClick();
      setStatus('success');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (error) {
      setStatus('idle');
      throw error;
    }
  }, [onClick, disabled, status]);

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      disabled={disabled || status !== 'idle'}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileFocus={{ 
        boxShadow: disabled ? 'none' : '0 0 0 3px rgba(0,0,0,0.1)'
      }}
      className={`
        relative w-full py-3 px-6 font-semibold text-white rounded-lg transition-all duration-200
        disabled:cursor-not-allowed disabled:opacity-60 min-h-[44px]
        ${className || 'bg-primary-900 hover:bg-primary-800 focus:outline-none focus:ring-1 focus:ring-primary-900'}
        ${status === 'success' ? 'bg-green-600' : ''}
      `}
      aria-disabled={disabled || status !== 'idle'}
      aria-label={ariaLabel}
      aria-live="polite"
    >
      <AnimatePresence mode="wait">
        {status === 'loading' && (
          <motion.span
            key="loading"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="flex items-center justify-center gap-2"
          >
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Adding to cart...
          </motion.span>
        )}
        {status === 'success' && (
          <motion.span
            key="success"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center justify-center gap-2"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Added to cart!
          </motion.span>
        )}
        {status === 'idle' && (
          <motion.span
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {children}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
};

export default EnhancedAddToCartButton;
