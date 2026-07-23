import { useState, useEffect, useRef, useCallback } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, Navigation, EffectFade } from 'swiper/modules';
import { motion, AnimatePresence } from 'framer-motion';
import type { Swiper as SwiperType } from 'swiper';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import 'swiper/css/effect-fade';

export interface Slide {
  id: number;
  image: string;
  alt: string;
  eyebrow: string;
  headline: string;
  cta: string;
  ctaLink: string;
  textPosition?: 'left' | 'center' | 'right';
}

interface HeroSliderProps {
  slides: Slide[];
  autoplayDelay?: number;
}

// Animation variants
const textVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: 'easeOut' as const }
  }),
};

const HeroSlider = ({ slides, autoplayDelay = 6000 }: HeroSliderProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [key, setKey] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const swiperRef = useRef<SwiperType | null>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  if (!slides || slides.length === 0) {
    return null;
  }

  const startProgressTimer = () => {
    if (progressInterval.current) clearInterval(progressInterval.current);
    setProgress(0);
    const startTime = Date.now();
    progressInterval.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setProgress(Math.min((elapsed / autoplayDelay) * 100, 100));
    }, 50);
  };

  const handleScroll = useCallback(() => {
    setScrollY(window.scrollY);
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    startProgressTimer();
    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, [autoplayDelay]);

  const handleSlideChange = (swiper: SwiperType) => {
    setActiveIndex(swiper.realIndex);
    setKey(prev => prev + 1);
    startProgressTimer();
  };

  const getPositionClasses = (position?: 'left' | 'center' | 'right') => {
    switch (position) {
      case 'center':
        return 'items-center justify-center text-center';
      case 'right':
        return 'items-end justify-end text-right';
      default:
        return 'items-start justify-start text-left';
    }
  };

  return (
    <div className="relative w-full h-full">
      <Swiper
        modules={[Autoplay, Pagination, Navigation, EffectFade]}
        spaceBetween={0}
        slidesPerView={1}
        loop={slides.length > 1}
        autoplay={{
          delay: autoplayDelay,
          disableOnInteraction: false,
          pauseOnMouseEnter: true,
        }}
        pagination={{
          clickable: true,
          dynamicBullets: true,
        }}
        navigation={{
          enabled: true,
          nextEl: '.hero-next',
          prevEl: '.hero-prev',
        }}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        speed={800}
        onSwiper={(swiper) => (swiperRef.current = swiper)}
        onSlideChange={handleSlideChange}
        className="hero-slider w-full h-full"
      >
        {slides.map((slide, index) => (
          <SwiperSlide key={slide.id}>
            <div className="relative w-full h-full overflow-hidden">
              {/* Parallax Image Container */}
              <div 
                className="absolute inset-0 hero-parallax"
                style={{
                  transform: `translateY(${scrollY * 0.3}px)`,
                  transition: 'transform 0.1s linear'
                }}
              >
                <img
                  src={slide.image}
                  alt={slide.alt}
                  className="w-full h-full object-cover scale-110"
                  loading={slide.id === slides[0].id ? 'eager' : 'lazy'}
                  {...(slide.id === slides[0].id ? { fetchpriority: 'high' } : {})}
                  decoding="async"
                />
              </div>
              
              {/* Enhanced gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60" />
              
              {/* Text Content with Position Support */}
              <div className={`absolute inset-0 flex p-6 sm:p-8 lg:p-16 ${getPositionClasses(slide.textPosition)}`}>
                <AnimatePresence mode="wait">
                  {index === activeIndex && (
                    <motion.div 
                      key={key}
                      className="max-w-xl"
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                    >
                      {/* Eyebrow Text */}
                      <motion.p 
                        custom={0}
                        variants={textVariants}
                        className="font-display text-hero-eyebrow text-white italic drop-shadow-lg"
                      >
                        {slide.eyebrow}
                      </motion.p>
                      
                      {/* Headline Text */}
                      <motion.h1 
                        custom={1}
                        variants={textVariants}
                        className="font-display text-hero-headline text-white mt-2 drop-shadow-lg"
                      >
                        {slide.headline.split('\n').map((line, idx) => (
                          <span key={idx} className="block">
                            {line}
                          </span>
                        ))}
                      </motion.h1>
                      
                      {/* CTA Button with Enhanced Hover */}
                      <motion.a
                        href={slide.ctaLink}
                        custom={2}
                        variants={textVariants}
                        whileHover={{ scale: 1.05, boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}
                        whileTap={{ scale: 0.95 }}
                        className="inline-block mt-6 lg:mt-10 px-8 py-3 sm:px-10 sm:py-4 bg-primary-500 text-white font-display font-bold text-lg sm:text-xl rounded-lg transition-all duration-300 shadow-lg hover:bg-primary-600"
                      >
                        {slide.cta}
                      </motion.a>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </SwiperSlide>
        ))}

        {/* Navigation Arrows - Enhanced */}
        <button 
          className="hero-prev absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white/20 hover:bg-white/40 text-white rounded-full flex items-center justify-center transition-all duration-300 backdrop-blur-md border border-white/30 hover:scale-110"
          aria-label="Previous slide"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        
        <button 
          className="hero-next absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white/20 hover:bg-white/40 text-white rounded-full flex items-center justify-center transition-all duration-300 backdrop-blur-md border border-white/30 hover:scale-110"
          aria-label="Next slide"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </Swiper>

      {/* Progress Bar Indicator */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-10">
        <div 
          className="h-full bg-white transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      <style>{`
        .hero-parallax {
          will-change: transform;
          transform: translateZ(0);
        }
        
        :global(.hero-slider .swiper-pagination) {
          position: absolute;
          bottom: 20px !important;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
        }

        :global(.hero-slider .swiper-pagination-bullet) {
          width: 10px;
          height: 10px;
          background-color: rgba(255, 255, 255, 0.4);
          opacity: 1;
          transition: all 0.3s ease;
        }

        :global(.hero-slider .swiper-pagination-bullet-active) {
          background-color: white;
          width: 28px;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
};

export default HeroSlider;
