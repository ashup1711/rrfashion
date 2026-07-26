import { useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay } from 'swiper/modules';
import { motion } from 'framer-motion';
import 'swiper/css';

interface Brand {
  name: string;
  domain: string;
}

interface BrandCarouselProps {
  brands?: Brand[];
  autoplayDelay?: number;
}

const BRANDS: Brand[] = [
  { name: 'Biba', domain: 'biba.in' },
  { name: 'Libas', domain: 'libas.in' },
  { name: 'Soch', domain: 'soch.in' },
  { name: 'W for Woman', domain: 'wforwoman.com' },
  { name: 'Anouk', domain: 'anouk.in' },
  { name: 'Global Desi', domain: 'globaldesi.in' },
  { name: 'Varanga', domain: 'varanga.in' },
  { name: 'Indya', domain: 'indya.in' },
  { name: 'Rangriti', domain: 'rangriti.in' },
  { name: 'Aksh', domain: 'aksh.in' },
];

const BrandLogo = ({ brand }: { brand: Brand }) => {
  const [imgError, setImgError] = useState(false);
  const clearbitUrl = `https://logo.clearbit.com/${brand.domain}?size=120`;

  return (
    <div className="flex items-center justify-center h-16 md:h-20 px-4">
      {!imgError ? (
        <img
          src={clearbitUrl}
          alt={`${brand.name} logo`}
          className="max-h-full max-w-full object-contain transition-all duration-300 grayscale hover:grayscale-0 opacity-60 hover:opacity-100"
          loading="lazy"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="text-sm font-medium text-neutral-dark/40 uppercase tracking-wider">
          {brand.name}
        </span>
      )}
    </div>
  );
};

const BrandCarousel = ({ brands = BRANDS, autoplayDelay = 3000 }: BrandCarouselProps) => {
  return (
    <section className="page-section" aria-label="Featured Brands">
      <div className="container-page section-spacing">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-center font-display text-section-subtitle text-neutral-dark/60 uppercase tracking-widest mb-10">
            Featured Brands
          </h2>
        </motion.div>

        <div className="relative">
          <Swiper
            modules={[Autoplay]}
            spaceBetween={24}
            slidesPerView={2}
            loop
            autoplay={{
              delay: autoplayDelay,
              disableOnInteraction: false,
              pauseOnMouseEnter: true,
            }}
            speed={800}
            breakpoints={{
              480: { slidesPerView: 3 },
              768: { slidesPerView: 4 },
              1024: { slidesPerView: 5 },
              1280: { slidesPerView: 6 },
            }}
            className="brand-carousel"
          >
            {brands.map((brand, index) => (
              <SwiperSlide key={`${brand.name}-${index}`}>
                <BrandLogo brand={brand} />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    </section>
  );
};

export default BrandCarousel;
