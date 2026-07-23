import { Link } from 'react-router-dom';
import { ROUTES, CATEGORY_SLUGS } from '../../../utils/constants';

interface GalleryTile {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  link: string;
  span: 'large' | 'small';
}

const galleryTiles: GalleryTile[] = [
  {
    id: 'promotions',
    title: 'Festive Promotions',
    subtitle: 'Up to 50% off',
    image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80&w=900',
    link: ROUTES.SALE,
    span: 'large',
  },
  {
    id: 'accessories',
    title: 'Accessories',
    subtitle: 'Jewellery Edit',
    image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80&w=600',
    link: ROUTES.SHOP_CATEGORY(CATEGORY_SLUGS.JEWELLERY),
    span: 'small',
  },
  {
    id: 'new-in',
    title: 'New In',
    subtitle: 'Fresh arrivals',
    image: 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?auto=format&fit=crop&q=80&w=600',
    link: ROUTES.SHOP,
    span: 'small',
  },
  {
    id: 'kurtis',
    title: 'Kurtis',
    subtitle: 'Everyday comfort',
    image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&q=80&w=600',
    link: ROUTES.SHOP_CATEGORY(CATEGORY_SLUGS.KURTI),
    span: 'small',
  },
  {
    id: 'sarees',
    title: 'Sarees',
    subtitle: 'Timeless drape',
    image: 'https://images.unsplash.com/photo-1581044777550-4cfa60707c03?auto=format&fit=crop&q=80&w=600',
    link: ROUTES.SHOP_CATEGORY(CATEGORY_SLUGS.SAREE),
    span: 'small',
  },
  {
    id: 'wedding-edit',
    title: 'Wedding Edit',
    subtitle: 'For your special day',
    image: 'https://images.unsplash.com/photo-1617922001439-4a2e6562f328?auto=format&fit=crop&q=80&w=600',
    link: ROUTES.SHOP_CATEGORY(CATEGORY_SLUGS.LONG_KURTI),
    span: 'small',
  },
];

const GalleryTileCard = ({ tile }: { tile: GalleryTile }) => {
  return (
    <Link
      to={tile.link}
      className="group relative block overflow-hidden rounded-xl aspect-square bg-neutral-medium focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
      aria-label={`${tile.title} - ${tile.subtitle}`}
    >
      <img
        src={tile.image}
        alt={tile.title}
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-primary-950/70 via-primary-950/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-5 md:p-6 text-center">
        <h3 className="text-white font-display text-lg md:text-xl drop-shadow-md mb-1">
          {tile.title}
        </h3>
        <p className="text-primary-100 text-caption uppercase tracking-widest">
          {tile.subtitle}
        </p>
      </div>
    </Link>
  );
};

const ImageGallery = () => {
  const largeTile = galleryTiles.find((t) => t.span === 'large');
  const smallTiles = galleryTiles.filter((t) => t.span === 'small');

  return (
    <section className="page-section" role="region" aria-label="Shop by category">
      <div className="container-page section-spacing">
        <div className="text-center mb-12">
          <h2 className="text-section-title font-display text-neutral-nearBlack mb-4">
            Shop by Category
          </h2>
          <p className="text-section-subtitle text-neutral-dark max-w-2xl mx-auto">
            Discover our curated edits — from everyday kurtis to festive sarees and statement accessories.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {largeTile && (
            <div className="col-span-2 row-span-2">
              <GalleryTileCard tile={largeTile} />
            </div>
          )}
          {smallTiles.map((tile) => (
            <GalleryTileCard key={tile.id} tile={tile} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ImageGallery;
