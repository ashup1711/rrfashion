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

  return (
    <div className="flex gap-4 p-4 bg-white border border-gray-200 rounded-lg">
      {/* Product Image */}
      <div className="w-24 h-24 bg-gray-100 rounded-md flex-shrink-0 overflow-hidden flex items-center justify-center">
        {item.image ? (
          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-xs text-gray-400">Image</span>
        )}
      </div>

      {/* Product Details */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-gray-900 truncate">{item.name}</h3>
        {item.type && (
          <p className="mt-1 text-xs text-gray-500 capitalize">Type: {item.type}</p>
        )}
        <p className="mt-1 text-sm font-medium text-primary-600">{formatCurrency(price)}</p>

        {/* Quantity Controls */}
        <div className="mt-3 flex items-center gap-3">
          <div className="flex items-center border border-gray-300 rounded-md">
            <button
              className="px-2 py-1 text-gray-600 hover:text-gray-900"
              aria-label="Decrease quantity"
              onClick={() => onUpdateQuantity(Math.max(1, item.quantity - 1))}
            >-</button>
            <span className="px-3 py-1 text-sm text-gray-900 border-x border-gray-300">{item.quantity}</span>
            <button
              className="px-2 py-1 text-gray-600 hover:text-gray-900"
              aria-label="Increase quantity"
              onClick={() => onUpdateQuantity(item.quantity + 1)}
            >+</button>
          </div>
          <button
            className="text-sm text-red-500 hover:text-red-700 transition-colors"
            onClick={onRemove}
          >
            Remove
          </button>
        </div>
      </div>

      {/* Price Total */}
      <div className="text-right">
        <p className="text-sm font-medium text-gray-900">{formatCurrency(totalPrice)}</p>
      </div>
    </div>
  );
};

export default CartItem;
