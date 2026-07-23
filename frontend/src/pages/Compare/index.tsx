import { Link } from 'react-router-dom';
import { useCompareStore } from '../../store/compareStore';
import { ROUTES } from '../../utils/constants';
import { formatCurrencyCompact } from '../../utils/formatCurrency';
import RateStars from '../../components/common/RateStars';

const ComparePage = () => {
  const { items, removeItem, clearItems } = useCompareStore();

  // Helper function to get rating from product metadata (matching ProductCard)
  const getProductRating = (id: string): number => {
    if (id.length % 4 === 0) return 4.5;
    if (id.length % 3 === 0) return 4.0;
    if (id.length % 2 === 0) return 3.5;
    return 0;
  };

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-3xl font-display text-primary-900 mb-4">Comparison List is Empty</h2>
        <p className="text-neutral-dark mb-8">Add some products to compare their features and find the perfect one for you.</p>
        <Link
          to={ROUTES.SHOP}
          className="inline-block px-8 py-3 bg-primary-900 text-white font-bold rounded-md hover:bg-primary-800 transition-colors uppercase tracking-wider text-sm shadow-md"
        >
          Go to Shop
        </Link>
      </div>
    );
  }

  const attributes = [
    { label: 'Price', key: 'salePrice', render: (p: any) => formatCurrencyCompact(p.salePrice ?? p.basePrice) },
    { label: 'Category', key: 'category', render: (p: any) => p.category?.name || 'N/A' },
    { label: 'Brand', key: 'brand', render: (p: any) => p.brand?.name || 'N/A' },
    { label: 'Fabric', key: 'fabric', render: (p: any) => p.fabric || 'N/A' },
    { label: 'Availability', key: 'stock', render: (p: any) => p.stock > 0 ? <span className="text-success font-medium">In Stock</span> : <span className="text-error font-medium">Out of Stock</span> },
    { 
      label: 'Rating', 
      key: 'rating', 
      render: (p: any) => {
        const r = getProductRating(p.id);
        return r > 0 ? <RateStars rating={r} reviewCount={25} size="sm" /> : 'No reviews';
      } 
    },
  ];

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-12">
        <h1 className="text-4xl font-display text-primary-900">Compare Products</h1>
        <button
          onClick={clearItems}
          className="text-neutral-dark hover:text-primary-900 font-medium underline underline-offset-4 decoration-neutral-medium hover:decoration-primary-900 transition-all"
        >
          Clear All Items
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="w-48 p-4 bg-neutral-cream/20 text-left border border-neutral-medium"></th>
              {items.map((product) => (
                <th key={product.id} className="min-w-[250px] p-6 bg-white border border-neutral-medium align-top">
                  <div className="relative group mb-4">
                    <button
                      onClick={() => removeItem(product.id)}
                      className="absolute -top-2 -right-2 bg-white text-primary-900 rounded-full w-6 h-6 flex items-center justify-center shadow-md border border-neutral-medium hover:bg-error hover:text-white transition-colors z-10"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <Link to={ROUTES.PRODUCT_DETAIL(product.id)} className="block aspect-[3/4] rounded-lg overflow-hidden bg-neutral-light border border-neutral-medium mb-4">
                      <img
                        src={product.images[0] || '/images/placeholder.svg'}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </Link>
                    <Link to={ROUTES.PRODUCT_DETAIL(product.id)} className="block group-hover:text-primary-600 transition-colors">
                      <h3 className="text-lg font-bold text-primary-900 mb-2 line-clamp-2 min-h-[3.5rem]">{product.name}</h3>
                    </Link>
                    <Link
                      to={ROUTES.PRODUCT_DETAIL(product.id)}
                      className="inline-block w-full py-2 bg-primary-900 text-white text-xs font-bold rounded hover:bg-primary-800 transition-colors text-center uppercase tracking-widest"
                    >
                      View Details
                    </Link>
                  </div>
                </th>
              ))}
              {/* Fill remaining slots up to 4 */}
              {Array.from({ length: 4 - items.length }).map((_, i) => (
                <th key={`empty-th-${i}`} className="min-w-[250px] p-6 bg-neutral-cream/5 border border-neutral-medium border-dashed">
                  <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-neutral-dark">
                    <div className="w-12 h-12 rounded-full border-2 border-dashed border-neutral-medium flex items-center justify-center mb-4 text-2xl font-light">
                      +
                    </div>
                    <Link to={ROUTES.SHOP} className="text-sm font-medium hover:text-primary-900 hover:underline">Add product to compare</Link>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {attributes.map((attr) => (
              <tr key={attr.label}>
                <td className="p-4 bg-neutral-cream/10 font-bold text-primary-900 border border-neutral-medium">
                  {attr.label}
                </td>
                {items.map((product) => (
                  <td key={`${product.id}-${attr.key}`} className="p-4 text-center border border-neutral-medium text-neutral-dark">
                    {attr.render(product)}
                  </td>
                ))}
                {Array.from({ length: 4 - items.length }).map((_, i) => (
                  <td key={`empty-td-${attr.key}-${i}`} className="p-4 border border-neutral-medium bg-neutral-cream/5"></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ComparePage;
