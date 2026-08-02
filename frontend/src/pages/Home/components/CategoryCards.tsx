import { Link } from 'react-router-dom';
import { ROUTES, CATEGORY_SLUGS } from '../../../utils/constants';
import { useCategories } from '../../../hooks/useCategories';
import type { LandingSection } from '../../../hooks/useLandingPageData';
import type { Category } from '../../../types/category';
import LoadingSpinner from '../../../components/common/LoadingSpinner';

const FALLBACK_COLORS: Record<string, string> = {
  [CATEGORY_SLUGS.KURTI]: '#f0d5d5',
  [CATEGORY_SLUGS.SAREE]: '#d5d5f0',
  [CATEGORY_SLUGS.JEWELLERY]: '#e8d5f0',
};

const STATIC_SLUGS = [
  CATEGORY_SLUGS.KURTI,
  CATEGORY_SLUGS.SAREE,
  CATEGORY_SLUGS.JEWELLERY,
];

interface CategoryCardsProps {
  /** REQ-FE-LP-001: optional pre-fetched section from useLandingPageData. */
  section?: LandingSection<Category[]>;
}

const CategoryCards = ({ section }: CategoryCardsProps = {}) => {
  // Fallback for standalone usage — React Query dedupes against the landing hook.
  const internal = useCategories();
  const resolved: LandingSection<Category[]> = section ?? {
    status: internal.isLoading ? 'loading' : internal.isError ? 'error' : 'success',
    data: internal.data,
    error: internal.error ?? undefined,
    refetch: internal.refetch,
  };

  const visibleCategories = STATIC_SLUGS.map((slug) => {
    const apiCat = (resolved.data ?? [])?.find((c) => c.slug === slug);
    return {
      name: apiCat?.name || slug,
      slug,
      image: apiCat?.image || null,
      bg: FALLBACK_COLORS[slug] || '#f0e8d5',
    };
  });

  if (resolved.status === 'loading') {
    return (
      <section className="page-section" role="region" aria-label="Shop by category">
        <div className="container-page py-12">
          <h2 className="font-display text-section-subtitle text-black text-center mb-10">
            Category
          </h2>
          <div className="flex justify-center items-center h-[173px]">
            <LoadingSpinner label="Loading categories..." />
          </div>
        </div>
      </section>
    );
  }

  if (resolved.status === 'error') {
    return (
      <section className="page-section" role="region" aria-label="Shop by category">
        <div className="container-page py-12">
          <h2 className="font-display text-section-subtitle text-black text-center mb-10">
            Category
          </h2>
          <div className="flex justify-center items-center h-[173px]">
            <div className="text-center">
              <p className="text-body text-gray-400 mb-2">Unable to load categories</p>
              <p className="text-caption text-gray-400">
                {resolved.error?.message || 'Something went wrong. Please try again later.'}
              </p>
              <button
                onClick={() => resolved.refetch()}
                className="mt-4 px-5 py-2 bg-primary-600 text-white text-sm rounded-md hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                aria-label="Retry loading categories"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="page-section" role="region" aria-label="Shop by category">
      <div className="container-page py-12">
        <h2 className="font-display text-section-subtitle text-black text-center mb-10">
          Category
        </h2>
        <div className="flex justify-center items-start gap-[45px] max-w-[1360px] mx-auto">
          {visibleCategories.map((cat) => (
            <Link
              key={cat.slug}
              to={ROUTES.SHOP_CATEGORY(cat.slug)}
              className="group relative w-[236px] h-[173px] flex items-center justify-center"
            >
              <div className="w-[151px] h-[151px] rounded-full overflow-hidden shadow-md group-hover:scale-105 group-hover:shadow-xl transition-transform duration-300">
                {cat.image ? (
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{ backgroundColor: cat.bg }}
                  />
                )}
              </div>
              <span className="absolute inset-0 flex items-center justify-center text-black font-display text-body group-hover:text-primary-500 transition-colors">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoryCards;
