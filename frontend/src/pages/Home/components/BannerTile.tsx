import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import DealTimer from '../../../components/common/DealTimer';

export interface BannerTileConfig {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  link: string;
  countdownEnd?: Date | string;
  discount?: string;
  variant?: 'default' | 'overlay' | 'split';
}

interface BannerTileProps {
  config: BannerTileConfig;
}

const BannerTile: React.FC<BannerTileProps> = ({ config }) => {
  const { title, subtitle, image, link, countdownEnd, discount, variant = 'default' } = config;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <Link
        to={link}
        className="group relative block overflow-hidden rounded-2xl aspect-[2/1] md:aspect-[3/1] bg-neutral-medium"
      >
        {/* Background Image */}
        <img
          src={image}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
        />

        {/* Gradient Overlay */}
        <div className={`absolute inset-0 ${
          variant === 'overlay' 
            ? 'bg-gradient-to-r from-black/70 via-black/40 to-transparent' 
            : 'bg-gradient-to-t from-black/60 to-transparent'
        }`} />

        {/* Content */}
        <div className={`absolute inset-0 flex flex-col justify-end p-6 md:p-10 ${
          variant === 'overlay' ? 'items-start text-left' : 'items-center text-center'
        }`}>
          {/* Discount Badge */}
          {discount && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="inline-block px-4 py-1.5 bg-error text-white text-sm font-bold rounded-full mb-3"
            >
              {discount} OFF
            </motion.span>
          )}

          {/* Title */}
          <h3 className="text-white font-display text-2xl md:text-3xl lg:text-4xl font-bold mb-2 drop-shadow-lg">
            {title}
          </h3>

          {/* Subtitle */}
          <p className="text-white/90 text-sm md:text-base mb-4 max-w-md">
            {subtitle}
          </p>

          {/* Countdown Timer */}
          {countdownEnd && (
            <div className="mb-4">
              <DealTimer endDate={countdownEnd} variant="full" />
            </div>
          )}

          {/* CTA Button */}
          <motion.span
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-neutral-nearBlack font-semibold rounded-full hover:bg-primary-500 hover:text-white transition-colors"
          >
            Shop Now
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </motion.span>
        </div>
      </Link>
    </motion.div>
  );
};

export default BannerTile;
