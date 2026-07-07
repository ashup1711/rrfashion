import { Link } from 'react-router-dom';
import { useCategories } from '../../../hooks/useCategories';
import { useProducts } from '../../../hooks/useProducts';
import ProductCard from '../../../components/common/ProductCard';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import { ROUTES } from '../../../utils/constants';

interface ProductCollectionProps {
  title: string;
  categorySlug?: string;
  featured?: boolean;
}

const ProductCollection = ({ title, categorySlug, featured }: ProductCollectionProps) => {
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const category = categorySlug ? categories?.find((c) => c.slug === categorySlug) : undefined;

  const { data, isLoading, isError, error } = useProducts(
    featured
      ? { isFeatured: true, limit: 4 }
      : category
        ? { categoryId: category.id, limit: 4 }
        : { limit: 4 },
  );

  // Loading state — wait for both categories and products
  if (categoriesLoading || isLoading) {
    return (
      <section className="page-section">
        <div className="h-[536px] flex items-center justify-center">
          <LoadingSpinner label={`Loading ${title}...`} />
        </div>
      </section>
    );
  }

  // Error state
  if (isError) {
    return (
      <section className="page-section">
        <div className="container-page section-spacing">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-display text-section-heading text-black">
              {title}
            </h2>
            <Link
              to={categorySlug ? ROUTES.SHOP_CATEGORY(categorySlug) : ROUTES.SHOP}
              className="text-[16px] text-black font-normal hover:text-pink-rose transition-colors"
            >
              See all &gt;
            </Link>
          </div>
          <div className="flex justify-center items-center h-[200px] text-gray-500">
            <div className="text-center">
              <p className="text-body text-gray-400 mb-2">
                Unable to load products
              </p>
              <p className="text-body-xs text-gray-400">
                {(error as Error)?.message || 'Something went wrong. Please try again later.'}
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Empty state — category found but no products match
  if (!data?.items?.length) {
    return (
      <section className="page-section">
        <div className="container-page section-spacing">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-display text-section-heading text-black">
              {title}
            </h2>
            <Link
              to={categorySlug ? ROUTES.SHOP_CATEGORY(categorySlug) : ROUTES.SHOP}
              className="text-[16px] text-black font-normal hover:text-pink-rose transition-colors"
            >
              See all &gt;
            </Link>
          </div>
          <div className="flex justify-center items-center h-[200px]">
            <p className="text-body text-gray-400">No products available in this collection yet.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="page-section">
      <div className="container-page section-spacing">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-display text-section-heading text-black">
            {title}
          </h2>
          <Link
            to={categorySlug ? ROUTES.SHOP_CATEGORY(categorySlug) : ROUTES.SHOP}
            className="text-[16px] text-black font-normal hover:text-pink-rose transition-colors"
          >
            See all &gt;
          </Link>
        </div>
        <div className="flex justify-center gap-[28px] max-w-[1360px] mx-auto">
          {data.items.slice(0, 4).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProductCollection;
