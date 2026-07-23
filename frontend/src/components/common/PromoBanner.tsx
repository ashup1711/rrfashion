import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getActiveFestivePromo, type FestivePromoKey } from '../../utils/constants';

const STORAGE_PREFIX = 'promo_banner_dismissed:';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

const isDismissedRecently = (key: FestivePromoKey): boolean => {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (!raw) return false;
    const dismissedAt = Number.parseInt(raw, 10);
    if (!Number.isFinite(dismissedAt)) return false;
    return Date.now() - dismissedAt < DISMISS_DURATION_MS;
  } catch {
    return false;
  }
};

interface PromoBannerProps {
  now?: Date;
}

const PromoBanner = ({ now = new Date() }: PromoBannerProps) => {
  const active = getActiveFestivePromo(now);
  const [dismissedKey, setDismissedKey] = useState<FestivePromoKey | null>(null);

  useEffect(() => {
    if (active && isDismissedRecently(active.key)) {
      setDismissedKey(active.key);
    } else {
      setDismissedKey(null);
    }
  }, [active]);

  if (!active || dismissedKey === active.key) return null;

  const handleDismiss = () => {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${active.key}`, String(Date.now()));
    } catch {
      return;
    }
    setDismissedKey(active.key);
  };

  const message = `✨ ${active.label}: ${active.promo.discount}% off sitewide. Use code ${active.promo.code} ✨`;

  return (
    <AnimatePresence>
      <motion.div
        key={active.key}
        role="region"
        aria-label="Festival promotion"
        className="bg-primary-500 text-white py-3 px-4 text-center text-body font-medium relative"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="container-page flex items-center justify-center pr-8">
          <span>{message}</span>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/90 hover:text-white transition-colors"
          aria-label="Dismiss promotion"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </motion.div>
    </AnimatePresence>
  );
};

export default PromoBanner;
