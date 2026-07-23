import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';

const MESSAGES = [
  'Free shipping on orders over ₹999',
  'Cash on Delivery available',
  'Use code FIRST10 for 10% off your first order',
  'New Diwali collection now live',
];

const STORAGE_KEY = 'announcement_bar_dismissed';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const ROTATION_INTERVAL_MS = 5 * 1000;

const HIDE_PREFIXES = ['/checkout', '/pos', '/admin'];

const isHiddenPath = (pathname: string): boolean =>
  HIDE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

const isDismissedRecently = (): boolean => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const dismissedAt = Number.parseInt(raw, 10);
    if (!Number.isFinite(dismissedAt)) return false;
    return Date.now() - dismissedAt < DISMISS_DURATION_MS;
  } catch {
    return false;
  }
};

const AnnouncementBar = () => {
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);

  if (isHiddenPath(location.pathname)) return null;

  useEffect(() => {
    setVisible(!isDismissedRecently());
  }, []);

  useEffect(() => {
    if (!visible) return undefined;
    const timer = window.setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % MESSAGES.length);
    }, ROTATION_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [visible]);

  const handleDismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      return;
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="bg-neutral-nearBlack text-neutral-white text-caption py-2 px-4 text-center relative"
      role="region"
      aria-label="Site announcements"
    >
      <div className="container-page flex items-center justify-center min-h-[24px]">
        <AnimatePresence initial={false}>
          <motion.span
            key={messageIndex}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="block"
          >
            {MESSAGES[messageIndex]}
          </motion.span>
        </AnimatePresence>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-white/80 hover:text-white transition-colors"
        aria-label="Dismiss announcement"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

export default AnnouncementBar;
