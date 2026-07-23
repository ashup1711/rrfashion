import { useMemo } from 'react';
import { formatCurrency } from '../../../utils/formatCurrency';
import type { CartItemState } from '../../../store/cartStore';

interface CartItemProps {
  item: CartItemState;
  onUpdateQuantity: (quantity: number) => void;
  onRemove: () => void;
}

const CartItem = ({ item, onUpdateQuantity, onRemove }: CartItemProps) => {
  const price = item.salePrice ?? item.basePrice;
  const totalPrice = price * item.quantity;

  const estimatedDelivery = useMemo(() => {
    const today = new Date();
    const minDays = 3;
    const maxDays = 5;
    
    const minDate = new Date(today);
    minDate.setDate(today.getDate() + minDays);
    
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + maxDays);

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
      });
    };

    return `${formatDate(minDate)} - ${formatDate(maxDate)}`;
  }, []);

  return (
    <div className="flex flex-col sm:flex-row gap-6 p-6 bg-white border border-neutral-medium rounded-xl hover:shadow-md transition-shadow">
      {/* Product Image */}
      <div className="w-full sm:w-32 h-40 sm:h-32 bg-neutral-light rounded-lg flex-shrink-0 overflow-hidden relative group">
        {item.image ? (
          <img 
            src={item.image} 
            alt={item.name} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-neutral-medium">
            <span className="text-xs text-neutral-dark font-medium uppercase tracking-wider">No Image</span>
          </div>
        )}
        {item.type === 'rent' && (
          <div className="absolute top-2 left-2 px-2 py-0.5 bg-primary-500 text-white text-[10px] font-bold uppercase rounded shadow-sm">
            Rent
          </div>
        )}
      </div>

      {/* Product Details */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start mb-1">
            <h3 className="text-base font-bold text-primary-900 hover:text-primary-600 transition-colors cursor-pointer line-clamp-1">
              {item.name}
            </h3>
            <p className="text-base font-bold text-primary-900">{formatCurrency(totalPrice)}</p>
          </div>
          
          <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4">
            {item.type && (
              <p className="text-xs text-neutral-dark flex items-center">
                <span className="w-1.5 h-1.5 bg-neutral-dark rounded-full mr-1.5 opacity-40"></span>
                <span className="font-medium">Type:</span>
                <span className="ml-1 capitalize">{item.type}</span>
              </p>
            )}
            <p className="text-xs text-neutral-dark flex items-center">
              <span className="w-1.5 h-1.5 bg-neutral-dark rounded-full mr-1.5 opacity-40"></span>
              <span className="font-medium">Price:</span>
              <span className="ml-1">{formatCurrency(price)}</span>
            </p>
          </div>

          <p className="text-xs text-success font-medium flex items-center mb-4">
            <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Estimated Delivery: {estimatedDelivery}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center bg-neutral-light rounded-full p-1 border border-neutral-medium">
            <button
              className="w-8 h-8 flex items-center justify-center text-neutral-dark hover:text-primary-900 transition-colors disabled:opacity-30"
              aria-label="Decrease quantity"
              onClick={() => onUpdateQuantity(Math.max(1, item.quantity - 1))}
              disabled={item.quantity <= 1}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <span className="w-10 text-center text-sm font-bold text-primary-900">{item.quantity}</span>
            <button
              className="w-8 h-8 flex items-center justify-center text-neutral-dark hover:text-primary-900 transition-colors"
              aria-label="Increase quantity"
              onClick={() => onUpdateQuantity(item.quantity + 1)}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
          
          <button
            className="text-xs font-bold text-error uppercase tracking-widest hover:text-red-700 transition-colors flex items-center gap-1.5"
            onClick={onRemove}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>Remove</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CartItem;
