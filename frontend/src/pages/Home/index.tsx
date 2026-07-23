import HeroBanner from './components/HeroBanner';
import CategoryCards from './components/CategoryCards';
import ProductCollection, { ProductCollectionTabs } from './components/ProductCollection';
import Lookbook from './components/Lookbook';
import Newsletter from './components/Newsletter';
import Testimonials from './components/Testimonials';
import InstagramShop from './components/InstagramShop';
import CountdownBanner from './components/CountdownBanner';
import BlogSection from './components/BlogSection';
import BannerTile from './components/BannerTile';
import RecentlyViewed from '../../components/common/RecentlyViewed';
import TrustBar from '../../components/common/TrustBar';
import PromoBanner from '../../components/common/PromoBanner';
import MarqueeTicker from '../../components/common/MarqueeTicker';
import { CATEGORY_SLUGS, ROUTES } from '../../utils/constants';

const Home = () => {
  return (
    <div>
      {/* Hero Section */}
      <HeroBanner />
      
      {/* Promo Banner */}
      <PromoBanner />
      
      {/* Category Cards */}
      <CategoryCards />
      
      {/* Countdown Banner for deals */}
      <CountdownBanner
        endDate={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)} // 7 days from now
        discount="50%"
        title="Limited-Time Deals On!"
        subtitle="Selected styles. Don't miss out on our biggest sale of the season."
      />
      
      {/* Tabbed Product Collection - New, Best Seller, On Sale */}
      <ProductCollectionTabs />
      
      {/* Lookbook */}
      <Lookbook />
      
      {/* Promotional Banner Tile */}
      <section className="page-section" aria-label="Special offers">
        <div className="container-page section-spacing">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <BannerTile
              config={{
                id: 'kurti-sale',
                title: 'Kurti Collection',
                subtitle: 'Up to 40% off on our latest kurti designs. Shop now!',
                image: 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?auto=format&fit=crop&w=800&q=80',
                link: ROUTES.SHOP_CATEGORY(CATEGORY_SLUGS.KURTI),
                discount: '40%',
                variant: 'default',
              }}
            />
            <BannerTile
              config={{
                id: 'saree-sale',
                title: 'Saree Collection',
                subtitle: 'Banarasi, silk & more. Exclusive designs for every occasion.',
                image: 'https://images.unsplash.com/photo-1581044777550-4cfa60707c03?auto=format&fit=crop&w=800&q=80',
                link: ROUTES.SHOP_CATEGORY(CATEGORY_SLUGS.SAREE),
                discount: '30%',
                variant: 'overlay',
              }}
            />
          </div>
        </div>
      </section>
      
      {/* Featured Collections */}
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
      
      <ProductCollection
        title="Saree Collection"
        categorySlug={CATEGORY_SLUGS.SAREE}
      />
      
      {/* Recently Viewed */}
      <RecentlyViewed />
      
      <ProductCollection
        title="Featured Collection"
        featured
      />
      
      {/* Blog Section */}
      <BlogSection />
      
      {/* Testimonials */}
      <Testimonials />
      
      {/* Trust Bar */}
      <TrustBar />
      
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
