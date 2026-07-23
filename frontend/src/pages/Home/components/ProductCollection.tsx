import { Fragment, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCategories } from '../../../hooks/useCategories';
import { useProducts } from '../../../hooks/useProducts';
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
}: ProductCollectionProps) => {
  const [variant] = useState(getABVariant);

  useEffect(() => {
    console.log('[A/B Test] User assigned to variant:', variant);
  }, [variant]);

  const seeAllLabel = variant === 'B' ? 'View all >' : 'See all >';
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const category = categorySlug ? categories?.find((c) => c.slug === categorySlug) : undefined;

  const { data, isLoading, isError, error } = useProducts(
    featured
      ? { isFeatured: true, limit: 4 }
      : category
        ? { categoryId: category.id, limit: 4 }
        : { limit: 4 },
  );

  if (categoriesLoading || isLoading) {
    return (
      <section className="page-section" role="region" aria-label={title}>
        <div className="h-[536px] flex items-center justify-center">
          <LoadingSpinner label={`Loading ${title}...`} />
        </div>
      </section>
    );
  }

  if (isError) {
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
                {(error as Error)?.message || 'Something went wrong. Please try again later.'}
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!data?.items?.length) {
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

  const products = data.items.slice(0, 4);
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

const ProductCollectionTabs = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('newArrivals');

  // Build filter params based on active tab
  const getFilterParams = () => {
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
  };

  const { data, isLoading, isError, error } = useProducts(getFilterParams());

  if (isError) {
    return (
      <section className="page-section" role="region" aria-label="Product Collection">
        <div className="container-page section-spacing">
          <div className="flex justify-center items-center h-[200px] text-gray-500">
            <p>Unable to load products: {(error as Error)?.message}</p>
          </div>
        </div>
      </section>
    );
  }

  const products = data?.items || [];

  return (
    <section className="page-section" role="region" aria-label="Product Collection">
      <div className="container-page section-spacing">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="font-display text-section-title text-neutral-nearBlack mb-6">
            Our Products
          </h2>
          
          {/* Tab Navigation */}
          <div className="flex justify-center gap-2 md:gap-4 flex-wrap" role="tablist">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                role="tab"
                aria-selected={activeTab === tab.key}
                aria-controls={`tabpanel-${tab.key}`}
                className={`px-4 py-2 md:px-6 md:py-3 text-sm md:text-base font-medium rounded-full transition-all duration-300 ${
                  activeTab === tab.key
                    ? 'bg-primary-500 text-white shadow-md'
                    : 'bg-neutral-light text-neutral-dark hover:bg-primary-100 hover:text-primary-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div 
          id={`tabpanel-${activeTab}`}
          role="tabpanel"
          aria-label={`${TABS.find(t => t.key === activeTab)?.label} products`}
        >
          <AnimatePresence mode="wait">
            {isLoading ? (
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
