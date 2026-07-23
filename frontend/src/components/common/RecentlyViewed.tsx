import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, A11y } from 'swiper/modules';
import ProductCard from './ProductCard';
import { useRecentlyViewed } from '../../hooks/useRecentlyViewed';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';

const RecentlyViewed: React.FC = () => {
  const { recentlyViewed } = useRecentlyViewed();

  if (recentlyViewed.length === 0) return null;

  return (
    <section className="py-12 border-t border-neutral-medium bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-section-subtitle font-bold text-primary-900 mb-8 uppercase tracking-widest text-center">
          Recently Viewed
        </h2>

        <div className="relative group">
          <Swiper
            modules={[Navigation, A11y]}
            spaceBetween={20}
            slidesPerView={2}
            navigation={{
              nextEl: '.recent-next',
              prevEl: '.recent-prev',
            }}
            breakpoints={{
              640: { slidesPerView: 2 },
              768: { slidesPerView: 3 },
              1024: { slidesPerView: 4 },
              1280: { slidesPerView: 5 },
            }}
            className="recently-viewed-swiper"
          >
            {recentlyViewed.map((product) => (
              <SwiperSlide key={product.id}>
                <ProductCard product={product} />
              </SwiperSlide>
            ))}
          </Swiper>

          {/* Navigation Buttons */}
          <button className="recent-prev absolute left-[-15px] top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/90 backdrop-blur-sm shadow-md rounded-full flex items-center justify-center text-primary-900 opacity-0 group-hover:opacity-100 transition-all duration-300 border border-primary-100 hover:bg-white hover:scale-110">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button className="recent-next absolute right-[-15px] top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/90 backdrop-blur-sm shadow-md rounded-full flex items-center justify-center text-primary-900 opacity-0 group-hover:opacity-100 transition-all duration-300 border border-primary-100 hover:bg-white hover:scale-110">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
};

export default RecentlyViewed;
