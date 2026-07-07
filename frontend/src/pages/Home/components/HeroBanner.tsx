import { Link } from 'react-router-dom';
import { ROUTES } from '../../../utils/constants';
import { useProducts } from '../../../hooks/useProducts';

const FALLBACK_PLACEHOLDERS = [
  { bg: '#e3c4b3', offset: 'mt-8' },
  { bg: '#d4a89a', offset: '-mt-12' },
  { bg: '#f5d6c8', offset: 'mt-4' },
  { bg: '#e8c5b5', offset: '-mt-8' },
  { bg: '#dbb5a3', offset: 'mt-12' },
];

const OFFSETS = ['mt-8', '-mt-12', 'mt-4', '-mt-8', 'mt-12'];

const HeroBanner = () => {
  const { data } = useProducts({ isFeatured: true, limit: 5 });
  const products = data?.items ?? [];
  const items = products.length > 0 ? products : [];

  return (
    <section
      className="bg-pink-banner min-h-[400px] lg:h-[576px]"
      style={{ backgroundImage: 'linear-gradient(135deg, #e79cb9 0%, #d48aa8 100%)' }}
    >
      <div className="container-page h-full py-8 lg:py-0">
        <div className="flex flex-col lg:flex-row items-start lg:items-start justify-between h-full relative gap-8 lg:gap-0">
          <div className="pt-0 lg:pt-16 text-center lg:text-left">
            <p className="font-display text-hero-eyebrow text-deep-maroon text-3xl lg:text-hero-eyebrow">
              NEW
            </p>
            <h1 className="font-display text-hero-headline text-deep-maroon leading-[1.1] mt-2 text-4xl lg:text-hero-headline">
              FASHION
              <br />
              COLLECTION
            </h1>
            <Link
              to={ROUTES.SHOP}
              className="inline-flex items-center justify-center w-full sm:w-auto lg:w-[324px] h-[60px] sm:h-[80px] lg:h-[103px] bg-mauve text-white font-display font-bold text-xl sm:text-2xl lg:text-[32px] rounded-[4px] mt-6 lg:mt-10 hover:opacity-90 transition-opacity px-6"
            >
              SHOP NOW
            </Link>
          </div>

          {/* Product images - hidden on mobile */}
          <div className="hidden lg:flex items-start gap-4 pr-4 relative">
            {Array.from({ length: 5 }).map((_, index) => {
              const product = items[index];
              const placeholder = FALLBACK_PLACEHOLDERS[index];

              return (
                <div
                  key={index}
                  className={`w-[204px] h-[454px] border-2 border-mauve rounded-[4px] overflow-hidden shrink-0 ${OFFSETS[index]}`}
                >
                  {product ? (
                    <img
                      src={product.images?.[0] || '/images/placeholder.svg'}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div
                      className="w-full h-full"
                      style={{ backgroundColor: placeholder.bg }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroBanner;
