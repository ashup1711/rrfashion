import { Product } from '../../types/product';

interface ProductBadgeProps {
  product: Product;
  className?: string;
}

const ProductBadge = ({ product, className = '' }: ProductBadgeProps) => {
  const hasSalePrice = product.salePrice !== undefined && product.salePrice < product.basePrice;
  const discountPercent = hasSalePrice && product.salePrice !== undefined
    ? Math.round(((product.basePrice - product.salePrice) / product.basePrice) * 100)
    : 0;

  const stockStatus = 
    product.stock === 0 ? 'Out of Stock' : 
    product.stock <= 5 ? 'Low Stock' : 
    'In Stock';

  return (
    <div className={`absolute top-2 left-2 z-10 flex flex-col gap-1 ${className}`}>
      {hasSalePrice && (
        <span className="bg-error text-white text-xs font-semibold px-2 py-0.5 rounded">
          -{discountPercent}%
        </span>
      )}
      {product.isFeatured && (
        <span className="bg-info text-white text-xs font-semibold px-2 py-0.5 rounded">
          NEW
        </span>
      )}
      {product.stock <= 5 && (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
          product.stock === 0 
            ? 'bg-error text-white' 
            : 'bg-warning text-white'
        }`}>
          {stockStatus}
        </span>
      )}
    </div>
  );
};

export default ProductBadge;