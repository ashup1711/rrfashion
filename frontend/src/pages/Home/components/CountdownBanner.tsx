import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ROUTES } from '../../../utils/constants';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

interface CountdownBannerProps {
  endDate: Date | string;
  discount?: string;
  title?: string;
  subtitle?: string;
  image?: string;
}

const CountdownBanner: React.FC<CountdownBannerProps> = ({
  endDate,
  discount = '50%',
  title = 'Limited-Time Deals On!',
  subtitle = 'Selected styles. Don\'t miss out.',
  image,
}) => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);

  useEffect(() => {
    const calculateTimeLeft = (): TimeLeft | null => {
      const difference = +new Date(endDate) - +new Date();
      if (difference <= 0) return null;
      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000);
    return () => clearInterval(timer);
  }, [endDate]);

  if (!timeLeft) return null;

  const timeUnits = [
    { label: 'Days', value: timeLeft.days },
    { label: 'Hrs', value: timeLeft.hours },
    { label: 'Min', value: timeLeft.minutes },
    { label: 'Sec', value: timeLeft.seconds },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="relative overflow-hidden bg-gradient-to-r from-primary-700 to-primary-900"
    >
      {image && (
        <div className="absolute inset-0">
          <img
            src={image}
            alt=""
            className="w-full h-full object-cover opacity-20"
            loading="lazy"
          />
        </div>
      )}

      <div className="container-page relative z-10 py-8 md:py-12">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          {/* Content */}
          <div className="text-center lg:text-left">
            <motion.span
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="inline-block px-4 py-1 bg-error text-white text-sm font-bold rounded-full mb-3"
            >
              UP TO {discount} OFF
            </motion.span>
            <h2 className="text-2xl md:text-3xl font-display font-bold text-white mb-2">
              {title}
            </h2>
            <p className="text-white/80">{subtitle}</p>
          </div>

          {/* Countdown Timer */}
          <div className="flex gap-3 md:gap-4">
            {timeUnits.map((unit, idx) => (
              <div
                key={idx}
                className="flex flex-col items-center bg-white/10 backdrop-blur-sm rounded-full p-3 md:p-4 w-[70px] h-[70px] md:w-[90px] md:h-[90px]"
              >
                <motion.span
                  key={unit.value}
                  initial={{ scale: 1.2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-2xl md:text-4xl font-bold text-white"
                >
                  {String(unit.value).padStart(2, '0')}
                </motion.span>
                <span className="text-[10px] md:text-xs text-white/60 uppercase font-medium mt-1">
                  {unit.label}
                </span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <Link
            to={ROUTES.SALE}
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-primary-700 font-bold rounded-full hover:bg-primary-50 transition-colors shadow-lg flex-shrink-0"
          >
            Shop Sale Now
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </motion.section>
  );
};

export default CountdownBanner;
