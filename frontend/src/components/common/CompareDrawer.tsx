import { Link } from 'react-router-dom';
import { useCompareStore } from '../../store/compareStore';
import { ROUTES } from '../../utils/constants';

const CompareDrawer = () => {
  const { items, removeItem, clearItems } = useCompareStore();

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-neutral-medium shadow-xl transform transition-transform duration-300 animate-in slide-in-from-bottom">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
            <h4 className="text-sm font-bold text-primary-900 uppercase tracking-wider whitespace-nowrap">
              Compare ({items.length}/4)
            </h4>
            <div className="flex items-center gap-3">
              {items.map((product) => (
                <div key={product.id} className="relative flex-shrink-0 group">
                  <div className="w-16 h-20 md:w-20 md:h-24 bg-neutral-light rounded overflow-hidden border border-neutral-medium">
                    <img
                      src={product.images[0] || '/images/placeholder.svg'}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    onClick={() => removeItem(product.id)}
                    className="absolute -top-2 -right-2 bg-white text-primary-900 rounded-full w-5 h-5 flex items-center justify-center shadow-md border border-neutral-medium hover:bg-error hover:text-white transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-primary-900 text-white text-[10px] rounded whitespace-nowrap z-10">
                    {product.name}
                  </div>
                </div>
              ))}
              
              {/* Empty slots */}
              {Array.from({ length: 4 - items.length }).map((_, i) => (
                <div key={`empty-${i}`} className="w-16 h-20 md:w-20 md:h-24 border-2 border-dashed border-neutral-medium rounded flex items-center justify-center bg-neutral-cream/30">
                  <span className="text-neutral-dark text-xs">+</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto">
            <button
              onClick={clearItems}
              className="text-sm font-medium text-neutral-dark hover:text-primary-900 underline underline-offset-4"
            >
              Clear All
            </button>
            <Link
              to={ROUTES.COMPARE}
              className="flex-1 md:flex-none text-center px-8 py-3 bg-primary-900 text-white font-bold rounded-md hover:bg-primary-800 transition-colors uppercase tracking-wider text-sm shadow-md"
            >
              Compare Now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompareDrawer;
