import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

const STORAGE_KEY = 'pwa_install_dismissed';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const DWELL_TIME_MS = 30 * 1000;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

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

const HIDE_PREFIXES = ['/checkout', '/pos', '/admin'];

const isHiddenPath = (pathname: string): boolean =>
  HIDE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

const PWAInstallPrompt = () => {
  const location = useLocation();
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  if (isHiddenPath(location.pathname)) return null;

  useEffect(() => {
    if (isDismissedRecently()) return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
    };

    const handleAppInstalled = () => {
      deferredPrompt.current = null;
      setVisible(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    const timer = window.setTimeout(() => {
      if (deferredPrompt.current) {
        setVisible(true);
      }
    }, DWELL_TIME_MS);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.clearTimeout(timer);
    };
  }, []);

  const handleInstall = async () => {
    const prompt = deferredPrompt.current;
    if (!prompt) return;
    try {
      await prompt.prompt();
      await prompt.userChoice;
    } finally {
      deferredPrompt.current = null;
      setVisible(false);
    }
  };

  const handleDismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      return;
    }
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="status"
          aria-live="polite"
          className="fixed bottom-32 lg:bottom-24 left-1/2 -translate-x-1/2 z-40 bg-neutral-nearBlack text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-body-small flex-1">
            Install RR Fashion — shop faster, get app-only offers
          </p>
          <button
            type="button"
            onClick={handleInstall}
            className="px-3 py-1.5 rounded-full bg-primary-500 text-white text-caption font-semibold hover:bg-primary-600 transition-colors whitespace-nowrap"
          >
            Install
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="px-3 py-1.5 rounded-full text-white/80 text-caption font-semibold hover:text-white transition-colors whitespace-nowrap"
          >
            Not now
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PWAInstallPrompt;
