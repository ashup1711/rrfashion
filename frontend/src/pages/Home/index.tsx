import { useMemo } from 'react';
import HeroBanner from './components/HeroBanner';
import CategoryCards from './components/CategoryCards';
import ProductCollection, { ProductCollectionTabs } from './components/ProductCollection';
import Newsletter from './components/Newsletter';
import Testimonials from './components/Testimonials';
import InstagramShop from './components/InstagramShop';
import CountdownBanner from './components/CountdownBanner';
import BlogSection from './components/BlogSection';
import BrandCarousel from './components/BrandCarousel';
import TrustBar from '../../components/common/TrustBar';
import PromoBanner from '../../components/common/PromoBanner';
import MarqueeTicker from '../../components/common/MarqueeTicker';
import { useLandingPageData } from '../../hooks/useLandingPageData';
import { CATEGORY_SLUGS, ROUTES } from '../../utils/constants';

const Home = () => {
  // REQ-FE-LP-001: centralize all landing-page API data (categories + 4 product
  // sections). All calls go through the secured apiClient (guest Bearer attached
  // by interceptor); each section carries its own status/error/refetch.
  const { categories, newArrivals, bestSellers, onSale } = useLandingPageData();

  // REQ-FE-LP-003: stable endDate so CountdownBanner does not re-create its
  // interval on every render of Home.
  const countdownEndDate = useMemo(
    () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    [],
  );

  return (
    <div>
      {/* Hero Section */}
      <HeroBanner />

      {/* Promo Banner */}
      <PromoBanner />

      {/* Trust Bar - moved up right after hero */}
      <TrustBar />

      {/* Category Cards */}
      <CategoryCards section={categories} />

      {/* Countdown Banner for deals */}
      <CountdownBanner
        endDate={countdownEndDate}
        discount="50%"
        title="Limited-Time Deals On!"
        subtitle="Selected styles. Don't miss out on our biggest sale of the season."
      />

      {/* Tabbed Product Collection - New, Best Seller, On Sale */}
      <ProductCollectionTabs sections={{ newArrivals, bestSellers, onSale }} />

      {/* Featured Collection - Kurti only (removed Saree to reduce clutter) */}
      <ProductCollection
        title="Kurti Collection"
        categorySlug={CATEGORY_SLUGS.KURTI}
        promoTileAfter={2}
        promoTileConfig={{
          title: 'Super Sale\nUp to 50%',
          subtitle: 'On select kurtis',
          cta: 'Shop Sale',
          link: ROUTES.SALE,
          bgColor: 'bg-primary-500',
        }}
      />

      {/* Brand Carousel - between products and blog */}
      <BrandCarousel />

      {/* Blog Section */}
      <BlogSection />

      {/* Testimonials */}
      <Testimonials />

      {/* Instagram Shop */}
      <InstagramShop />

      {/* Newsletter */}
      <Newsletter />

      {/* Marquee Ticker */}
      <MarqueeTicker />
    </div>
  );
};

export default Home;
