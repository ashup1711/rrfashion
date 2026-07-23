import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '../../store/uiStore';
import { useCartStore } from '../../store/cartStore';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { formatCurrency } from '../../utils/formatCurrency';
import { ROUTES } from '../../utils/constants';
import FreeShippingBar from './FreeShippingBar';

const MAX_VISIBLE_ITEMS = 5;

const MiniCart = () => {
  const isOpen = useUIStore((state) => state.isMiniCartOpen);
  const closeMiniCart = useUIStore((state) => state.closeMiniCart);
  const { items, total, removeItem, updateQuantity } = useCartStore();

  const panelRef = useFocusTrap<HTMLDivElement>(isOpen, { onEscape: closeMiniCart });

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
    return undefined;
  }, [isOpen]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) closeMiniCart();
  };

  const handleQtyChange = (id: string, currentQty: number, delta: number) => {
    const next = currentQty + delta;
    if (next <= 0) {
      removeItem(id);
    } else {
      updateQuantity(id, next);
    }
  };

  const visibleItems = items.slice(0, MAX_VISIBLE_ITEMS);
  const hasMoreItems = items.length > MAX_VISIBLE_ITEMS;
  const isEmpty = items.length === 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          onClick={handleBackdropClick}
        >
          <motion.div
            className="absolute inset-0 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            aria-hidden="true"
          />

          <motion.div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Shopping cart"
            className="relative w-full max-w-md lg:max-w-md h-full bg-white shadow-2xl flex flex-col"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="bg-white border-b border-neutral-medium px-6 py-4 flex items-center justify-between">
              <h2 className="text-section-subtitle font-display text-primary-900">Your Cart</h2>
              <button
                type="button"
                onClick={closeMiniCart}
                className="p-2 rounded-full hover:bg-neutral-light transition-colors"
                aria-label="Close cart"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {isEmpty ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                <svg className="w-16 h-16 text-neutral-medium mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-body text-neutral-dark mb-4">Your cart is empty.</p>
                <Link
                  to={ROUTES.SHOP}
                  onClick={closeMiniCart}
                  className="text-primary-500 font-semibold hover:underline"
                >
                  Continue shopping
                </Link>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-6">
                  <ul className="space-y-4">
                    <AnimatePresence initial={false}>
                      {visibleItems.map((item, index) => {
                        const key = item.id ?? item.variantId ?? item.productId;
                        const lineTotal = (item.salePrice ?? item.basePrice) * item.quantity;
                        return (
                          <motion.li
                            key={key}
                            layout
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ 
                              opacity: 1, 
                              y: 0, 
                              scale: 1,
                              transition: {
                                delay: index * 0.05,
                                type: 'spring',
                                stiffness: 300,
                                damping: 20,
                              }
                            }}
                            exit={{ 
                              opacity: 0, 
                              x: 100,
                              scale: 0.8,
                              transition: {
                                duration: 0.2,
                                ease: 'easeInOut'
                              }
                            }}
                            className="flex gap-3 bg-white rounded-lg p-2 hover:bg-gray-50 transition-colors"
                          >
                            <motion.div 
                              className="w-16 h-20 bg-neutral-light rounded overflow-hidden flex-shrink-0 shadow-sm"
                              whileHover={{ scale: 1.02 }}
                              transition={{ type: 'spring', stiffness: 400 }}
                            >
                              <img
                                src={item.image || '/images/placeholder.svg'}
                                alt={item.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            </motion.div>
                            <div className="flex-1 min-w-0">
                              <Link
                                to={ROUTES.PRODUCT_DETAIL(item.productId)}
                                onClick={closeMiniCart}
                                className="text-body-small font-semibold text-neutral-nearBlack hover:text-primary-500 transition-colors line-clamp-2"
                              >
                                {item.name}
                              </Link>
                              <motion.p 
                                className="text-caption text-primary-500 font-medium mt-1"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: index * 0.05 + 0.1 }}
                              >
                                {formatCurrency(lineTotal)}
                              </motion.p>
                              <div className="flex items-center gap-2 mt-2">
                                <motion.button
                                  type="button"
                                  onClick={() => handleQtyChange(key, item.quantity, -1)}
                                  className="w-6 h-6 rounded border border-neutral-medium flex items-center justify-center text-neutral-dark hover:border-primary-500 hover:text-primary-500 hover:bg-primary-50 transition-colors focus:outline-none focus:ring-1 focus:ring-primary-500"
                                  aria-label="Decrease quantity"
                                  whileTap={{ scale: 0.95 }}
                                >
                                  −
                                </motion.button>
                                <motion.span 
                                  key={item.quantity}
                                  className="text-caption font-semibold w-8 text-center"
                                  initial={{ scale: 1.2 }}
                                  animate={{ scale: 1 }}
                                  transition={{ type: 'spring', stiffness: 300 }}
                                >
                                  {item.quantity}
                                </motion.span>
                                <motion.button
                                  type="button"
                                  onClick={() => handleQtyChange(key, item.quantity, 1)}
                                  className="w-6 h-6 rounded border border-neutral-medium flex items-center justify-center text-neutral-dark hover:border-primary-500 hover:text-primary-500 hover:bg-primary-50 transition-colors focus:outline-none focus:ring-1 focus:ring-primary-500"
                                  aria-label="Increase quantity"
                                  whileTap={{ scale: 0.95 }}
                                >
                                  +
                                </motion.button>
                                <motion.button
                                  type="button"
                                  onClick={() => removeItem(key)}
                                  className="ml-auto text-caption text-red-600 hover:text-red-700 transition-colors hover:underline"
                                  aria-label={`Remove ${item.name}`}
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  Remove
                                </motion.button>
                              </div>
                            </div>
                          </motion.li>
                        );
                      })}
                    </AnimatePresence>
                  </ul>
                  {hasMoreItems && (
                    <motion.p 
                      className="text-caption text-neutral-dark text-center mt-4 font-medium"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      +{items.length - MAX_VISIBLE_ITEMS} more item{items.length - MAX_VISIBLE_ITEMS === 1 ? '' : 's'} in your cart
                    </motion.p>
                  )}
                </div>

                <div className="border-t border-neutral-medium p-6 bg-white">
                  <FreeShippingBar total={total} className="mb-4" />
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-body font-semibold text-neutral-nearBlack">Subtotal</span>
                    <span className="text-body font-bold text-primary-900">
                      {formatCurrency(total)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Link
                      to={ROUTES.CART}
                      onClick={closeMiniCart}
                      className="text-center py-3 rounded border border-primary-900 text-primary-900 font-semibold hover:bg-primary-50 transition-colors uppercase tracking-wider text-caption"
                    >
                      View Cart
                    </Link>
                    <Link
                      to={ROUTES.CHECKOUT}
                      onClick={closeMiniCart}
                      className="text-center py-3 rounded bg-primary-900 text-white font-semibold hover:bg-primary-800 transition-colors uppercase tracking-wider text-caption"
                    >
                      Checkout
                    </Link>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default MiniCart;
