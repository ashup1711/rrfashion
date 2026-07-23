import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const EXIT_STORAGE_KEY = 'exit_intent_dismissed';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const MOBILE_DELAY_MS = 60 * 1000;
const OFFER_EXPIRY_HOURS = 24;

const ExitIntentPopup = () => {
  const [show, setShow] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [copied, setCopied] = useState(false);
  const [expiryTime, setExpiryTime] = useState(OFFER_EXPIRY_HOURS * 60 * 60);
  const [offerType, _setOfferType] = useState<'discount' | 'shipping'>(
    Math.random() > 0.5 ? 'discount' : 'shipping'
  );

  // Countdown timer for offer expiry
  useEffect(() => {
    if (!show) return;
    const timer = setInterval(() => {
      setExpiryTime((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [show]);

  useEffect(() => {
    try {
      const dismissedAt = localStorage.getItem(EXIT_STORAGE_KEY);
      if (dismissedAt && Date.now() - Number(dismissedAt) < DISMISS_DURATION_MS) {
        return;
      }
    } catch { /* private browsing */ }

    const isMobile = window.innerWidth < 768;
    let mobileTimer: ReturnType<typeof setTimeout> | undefined;

    if (isMobile) {
      mobileTimer = setTimeout(() => setShow(true), MOBILE_DELAY_MS);
    }

    const handleMouseLeave = (e: MouseEvent) => {
      if (!isMobile && e.clientY <= 0) {
        setShow(true);
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
      if (mobileTimer) clearTimeout(mobileTimer);
    };
  }, []);

  const handleDismiss = () => {
    try {
      localStorage.setItem(EXIT_STORAGE_KEY, String(Date.now()));
    } catch { /* ignore */ }
    setShow(false);
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(offerType === 'discount' ? 'FIRST10' : 'FREESHIP');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = offerType === 'discount' ? 'FIRST10' : 'FREESHIP';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    // In a real app, this would call an API
    handleDismiss();
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="exit-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          onClick={(e) => { if (e.target === e.currentTarget) handleDismiss(); }}
        >
          <motion.div
            key="exit-modal"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-8 max-w-md w-full text-center relative shadow-2xl"
          >
            {/* Close Button - Improved visibility */}
            <button
              type="button"
              onClick={handleDismiss}
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 rounded-full transition-all"
              aria-label="Close"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
              </svg>
            </div>

            <h3 className="text-2xl font-display font-bold text-neutral-nearBlack mb-2">
              Don't Miss Out!
            </h3>
            <p className="text-body text-neutral-dark mb-4">
              {offerType === 'discount'
                ? <>Get <strong className="text-primary-600">10% off</strong> your first order.</>
                : <>Get <strong className="text-primary-600">free shipping</strong> on your first order.</>}
            </p>

            {/* Countdown Timer */}
            {expiryTime > 0 && (
              <div className="mb-4">
                <p className="text-caption text-warning font-semibold mb-1">
                  Offer expires in:
                </p>
                <span className="inline-block px-4 py-1.5 bg-warning/10 text-warning font-bold text-sm rounded-full">
                  {formatTime(expiryTime)}
                </span>
              </div>
            )}

            {/* Coupon Code Display with Copy Button */}
            <div className="bg-neutral-light rounded-lg px-6 py-3 mb-4 inline-flex items-center gap-3">
              <span className="text-2xl font-bold tracking-widest text-neutral-nearBlack select-all">
                {offerType === 'discount' ? 'FIRST10' : 'FREESHIP'}
              </span>
              <button
                onClick={handleCopyCode}
                className="px-3 py-1.5 bg-primary-500 text-white text-xs font-semibold rounded-md hover:bg-primary-600 transition-colors"
                aria-label={copied ? 'Copied!' : 'Copy coupon code'}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            {/* Email Capture Form */}
            {showEmailForm ? (
              <form onSubmit={handleEmailSubmit} className="space-y-3 mb-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  aria-label="Email address"
                />
                <button
                  type="submit"
                  className="w-full bg-primary-500 text-white px-8 py-3 rounded-lg font-medium hover:bg-primary-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                >
                  Send Me the Code
                </button>
              </form>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="w-full bg-primary-500 text-white px-8 py-3 rounded-lg font-medium hover:bg-primary-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                >
                  Continue Shopping
                </button>
                <button
                  type="button"
                  onClick={() => setShowEmailForm(true)}
                  className="w-full mt-2 text-sm text-gray-500 hover:text-primary-600 transition-colors py-2"
                >
                  Send code to my email instead
                </button>
              </>
            )}

            {/* No thanks option */}
            <button
              type="button"
              onClick={handleDismiss}
              className="mt-3 text-caption text-gray-400 hover:text-gray-600 transition-colors underline underline-offset-2"
            >
              No thanks, I don't want a discount
            </button>

            <p className="text-caption text-gray-400 mt-4">
              *Valid on first order only. Cannot be combined with other offers.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ExitIntentPopup;
