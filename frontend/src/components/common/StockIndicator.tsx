interface StockIndicatorProps {
  stock: number;
  threshold?: number; // Default: 5
}

export const StockIndicator = ({ stock, threshold = 5 }: StockIndicatorProps) => {
  if (stock <= 0) {
    return (
      <span className="text-red-600 text-xs font-medium">
        Out of Stock
      </span>
    );
  }

  if (stock <= threshold) {
    return (
      <span className="text-orange-600 font-bold text-sm flex items-center gap-1">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.72-1.36 3.485 0l6.518 11.03c.75 1.33-.213 2.99-1.742 2.99H3.48c-1.53 0-2.492-1.66-1.742-2.99L8.256 3.1z" clipRule="evenodd" />
        </svg>
        Only {stock} left!
      </span>
    );
  }

  return (
    <span className="text-green-600 text-xs font-medium">
      In Stock
    </span>
  );
};

export default StockIndicator;
