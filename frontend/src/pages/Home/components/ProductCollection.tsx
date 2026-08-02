import { Fragment, useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCategories } from '../../../hooks/useCategories';
import { useProducts } from '../../../hooks/useProducts';
import type { LandingSection } from '../../../hooks/useLandingPageData';
import type { ProductListResponse } from '../../../types/product';
import ProductCard from '../../../components/common/ProductCard';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import { ROUTES } from '../../../utils/constants';
import PromoTile, { type PromoTileConfig } from './PromoTile';

// ============ Original Product Collection (Legacy) ============

interface ProductCollectionProps {
  title: string;
  categorySlug?: string;
  featured?: boolean;
  promoTileAfter?: number;
  promoTileConfig?: PromoTileConfig;
  /** REQ-FE-LP-001: optional pre-fetched section from useLandingPageData. */
  section?: LandingSection<ProductListResponse>;
}

const getABVariant = (): 'A' | 'B' => {
  try {
    const stored = localStorage.getItem('ab_see_all_variant');
    if (stored === 'A' || stored === 'B') return stored;
    const assigned = Math.random() < 0.5 ? 'A' : 'B';
    localStorage.setItem('ab_see_all_variant', assigned);
    return assigned;
  } catch {
    return 'A';
  }
};

const ProductCollection = ({
  title,
  categorySlug,
  featured,
  promoTileAfter,
  promoTileConfig,
  section,
}: ProductCollectionProps) => {
  const [variant] = useState(getABVariant);

  useEffect(() => {
    console.log('[A/B Test] User assigned to variant:', variant);
  }, [variant]);

  const seeAllLabel = variant === 'B' ? 'View all >' : 'See all >';
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const category = categorySlug ? categories?.find((c) => c.slug === categorySlug) : undefined;

  // REQ-FE-LP-002: memoize filters so the query key is stable across renders
  // (with refetchOnMount: 'always', a fresh object each render causes churn).
  const collectionFilters = useMemo(() => {
    if (featured) return { isFeatured: true, limit: 4 } as const;
    if (category) return { categoryId: category.id, limit: 4 } as const;
    return { limit: 4 } as const;
  }, [featured, category]);

  const internal = useProducts(collectionFilters);

  // REQ-FE-LP-001: prefer the pre-fetched section from useLandingPageData when
  // provided (standalone usage falls back to the internal query).
  const resolved: LandingSection<ProductListResponse> = section ?? {
    status: internal.isLoading ? 'loading' : internal.isError ? 'error' : 'success',
    data: internal.data,
    error: internal.error ?? undefined,
    refetch: internal.refetch,
  };

  if (categoriesLoading || resolved.status === 'loading') {
    return (
      <section className="page-section" role="region" aria-label={title}>
        <div className="h-[536px] flex items-center justify-center">
          <LoadingSpinner label={`Loading ${title}...`} />
        </div>
      </section>
    );
  }

  if (resolved.status === 'error') {
    return (
      <section className="page-section" role="region" aria-label={title}>
        <div className="container-page section-spacing">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-display text-section-subtitle text-black">
              {title}
            </h2>
            <Link
              to={categorySlug ? ROUTES.SHOP_CATEGORY(categorySlug) : ROUTES.SHOP}
              className="text-[16px] text-black font-normal hover:text-primary-500 transition-colors"
            >
              {seeAllLabel}
            </Link>
          </div>
          <div className="flex justify-center items-center h-[200px] text-gray-500">
            <div className="text-center">
              <p className="text-body text-gray-400 mb-2">
                Unable to load products
              </p>
              <p className="text-caption text-gray-400">
                {resolved.error?.message || 'Something went wrong. Please try again later.'}
              </p>
              <button
                onClick={() => resolved.refetch()}
                className="mt-4 px-5 py-2 bg-primary-600 text-white text-sm rounded-md hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                aria-label={`Retry loading ${title}`}
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!resolved.data?.items?.length) {
    return (
      <section className="page-section" role="region" aria-label={title}>
        <div className="container-page section-spacing">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-display text-section-subtitle text-black">
              {title}
            </h2>
            <Link
              to={categorySlug ? ROUTES.SHOP_CATEGORY(categorySlug) : ROUTES.SHOP}
              className="text-[16px] text-black font-normal hover:text-primary-500 transition-colors"
            >
              {seeAllLabel}
            </Link>
          </div>
          <div className="flex justify-center items-center h-[200px]">
            <p className="text-body text-gray-400">No products available in this collection yet.</p>
          </div>
        </div>
      </section>
    );
  }

  const products = resolved.data.items.slice(0, 4);
  const showPromo = promoTileAfter !== undefined && promoTileConfig && products.length > promoTileAfter;

  return (
    <section className="page-section" role="region" aria-label={title}>
      <div className="container-page section-spacing">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-display text-section-subtitle text-black">
            {title}
          </h2>
          <Link
            to={categorySlug ? ROUTES.SHOP_CATEGORY(categorySlug) : ROUTES.SHOP}
            className="text-[16px] text-black font-normal hover:text-primary-500 transition-colors"
          >
            {seeAllLabel}
          </Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-card-gap">
          {products.map((product, idx) => (
            <Fragment key={product.id}>
              <ProductCard product={product} />
              {showPromo && idx === promoTileAfter && (
                <div className="col-span-2 lg:col-span-2 xl:col-span-2">
                  <PromoTile config={promoTileConfig!} />
                </div>
              )}
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  );
};

// ============ Tabbed Product Collection (New) ============

type TabKey = 'newArrivals' | 'bestSeller' | 'onSale';

interface Tab {
  key: TabKey;
  label: string;
}

const TABS: Tab[] = [
  { key: 'newArrivals', label: 'New Arrivals' },
  { key: 'bestSeller', label: 'Best Seller' },
  { key: 'onSale', label: 'On Sale' },
];

const contentVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.2 } }
};

interface ProductCollectionTabsProps {
  /** REQ-FE-LP-001: optional pre-fetched sections from useLandingPageData. */
  sections?: {
    newArrivals: LandingSection<ProductListResponse>;
    bestSellers: LandingSection<ProductListResponse>;
    onSale: LandingSection<ProductListResponse>;
  };
}

const ProductCollectionTabs = ({ sections }: ProductCollectionTabsProps = {}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('newArrivals');

  // REQ-FE-LP-002: memoize filter params per active tab so the query key is
  // stable across renders and tab switches refetch the right data.
  const filters = useMemo(() => {
    switch (activeTab) {
      case 'newArrivals':
        return { isNew: true, limit: 8 };
      case 'bestSeller':
        return { isBestSeller: true, limit: 8 };
      case 'onSale':
        return { isOnSale: true, limit: 8 };
      default:
        return { limit: 8 };
    }
  }, [activeTab]);

  const internal = useProducts(filters);

  // REQ-FE-LP-001: prefer pre-fetched sections; standalone usage falls back to
  // the internal query (React Query dedupes shared keys).
  // NOTE: section keys are pluralized (bestSellers) while tab keys are singular.
  const sectionByTab: Record<TabKey, keyof NonNullable<ProductCollectionTabsProps['sections']>> = {
    newArrivals: 'newArrivals',
    bestSeller: 'bestSellers',
    onSale: 'onSale',
  };
  const resolved: LandingSection<ProductListResponse> = sections
    ? sections[sectionByTab[activeTab]]
    : {
        status: internal.isLoading ? 'loading' : internal.isError ? 'error' : 'success',
        data: internal.data,
        error: internal.error ?? undefined,
        refetch: internal.refetch,
      };

  if (resolved.status === 'error') {
    return (
      <section className="page-section" role="region" aria-label="Product Collection">
        <div className="container-page section-spacing">
          <div className="flex justify-center items-center h-[200px] text-gray-500">
            <div className="text-center">
              <p>Unable to load products: {resolved.error?.message}</p>
              <button
                onClick={() => resolved.refetch()}
                className="mt-4 px-5 py-2 bg-primary-600 text-white text-sm rounded-md hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                aria-label="Retry loading products"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const products = resolved.data?.items || [];

  return (
    <section className="page-section" role="region" aria-label="Product Collection">
      <div className="container-page section-spacing">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="font-display text-section-title text-neutral-nearBlack mb-6">
            Our Products
          </h2>
          
          {/* Tab Navigation - Underline style */}
          <div className="border-b border-neutral-medium/30" role="tablist">
            <div className="flex justify-center gap-0 -mb-px">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  role="tab"
                  aria-selected={activeTab === tab.key}
                  aria-controls={`tabpanel-${tab.key}`}
                  className={`relative px-5 md:px-8 py-3 text-sm md:text-base font-medium transition-colors duration-200 ${
                    activeTab === tab.key
                      ? 'text-primary-500'
                      : 'text-neutral-dark hover:text-neutral-nearBlack'
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.key && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500"
                      transition={{ duration: 0.2 }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div 
          id={`tabpanel-${activeTab}`}
          role="tabpanel"
          aria-label={`${TABS.find(t => t.key === activeTab)?.label} products`}
        >
          <AnimatePresence mode="wait">
            {resolved.status === 'loading' ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-[400px] flex items-center justify-center"
              >
                <LoadingSpinner label="Loading products..." />
              </motion.div>
            ) : (
              <motion.div
                key={activeTab}
                variants={contentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="grid grid-cols-2 lg:grid-cols-4 gap-card-gap"
              >
                {products.length > 0 ? (
                  products.slice(0, 8).map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))
                ) : (
                  <div className="col-span-full text-center py-12 text-neutral-dark">
                    No products found in this category.
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* View All Link */}
        <div className="text-center mt-8">
          <Link
            to={ROUTES.SHOP}
            className="inline-flex items-center gap-2 px-6 py-3 border-2 border-primary-500 text-primary-500 font-semibold rounded-full hover:bg-primary-500 hover:text-white transition-all duration-300"
          >
            View All Products
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
};

export { ProductCollectionTabs };
export default ProductCollection;
