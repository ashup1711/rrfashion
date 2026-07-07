import { Link } from 'react-router-dom';
import { useProducts } from '../../../hooks/useProducts';
import ProductCard from '../../../components/common/ProductCard';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import { ROUTES } from '../../../utils/constants';
import { useEffect } from 'react';
import { ensureGuestSession } from '../../../utils/guestSessionInit';

const FeaturedProducts = () => {
  useEffect(() => {
    ensureGuestSession();
  }, []);
  
  const { data, isLoading } = useProducts({ isFeatured: true, limit: 4 });

  if (isLoading) return <LoadingSpinner label="Loading featured products..." />;

  return (
    <section className="container-page py-16">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Featured Products</h2>
        <Link
          to={ROUTES.SHOP}
          className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
        >
          View All &rarr;
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {data?.items?.slice(0, 4).map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
};

export default FeaturedProducts;
