import HeroBanner from './components/HeroBanner';
import CategoryCards from './components/CategoryCards';
import ProductCollection from './components/ProductCollection';
import { CATEGORY_SLUGS } from '../../utils/constants';

const Home = () => {
  return (
    <div>
      <HeroBanner />
      <CategoryCards />
      <ProductCollection
        title="Kurti Collection"
        categorySlug={CATEGORY_SLUGS.KURTI}
      />
      <ProductCollection
        title="Saree Collection"
        categorySlug={CATEGORY_SLUGS.SAREE}
      />
      <ProductCollection
        title="Featured Collection"
        featured
      />
    </div>
  );
};

export default Home;
