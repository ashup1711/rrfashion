import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useActiveReminders } from '../../../hooks/useReminders';
import type { SiteReminderActive } from '../../../types/reminder';

const DISMISSED_KEY = 'dismissed_reminders';

function getDismissedIds(): Set<string> {
  const raw = sessionStorage.getItem(DISMISSED_KEY);
  if (!raw) return new Set();
  return new Set(raw.split(',').filter(Boolean));
}

function addDismissedId(id: string): void {
  const ids = getDismissedIds();
  ids.add(id);
  sessionStorage.setItem(DISMISSED_KEY, Array.from(ids).join(','));
}

const ReminderBanner: React.FC = () => {
  const { data: reminders, isLoading, error } = useActiveReminders();
  const [visibleReminders, setVisibleReminders] = useState<SiteReminderActive[]>([]);

  useEffect(() => {
    if (!reminders || reminders.length === 0) {
      setVisibleReminders([]);
      return;
    }
    const dismissed = getDismissedIds();
    const undismissed = reminders.filter((r) => !dismissed.has(r.id));
    setVisibleReminders(undismissed);
  }, [reminders]);

  const dismiss = useCallback((id: string) => {
    addDismissedId(id);
    setVisibleReminders((prev) => prev.filter((r) => r.id !== id));
  }, []);

  if (error) {
    console.error('ReminderBanner failed to load:', error);
    return null;
  }

  if (isLoading || visibleReminders.length === 0) {
    return null;
  }

  const reminder = visibleReminders[0];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm py-2.5 px-4 relative"
        role="alert"
      >
        <div className="container-page flex items-center justify-center gap-3">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span>
            <span className="font-semibold">{reminder.title}: </span>
            {reminder.message}
          </span>
          {reminder.linkUrl && (
            <a
              href={reminder.linkUrl}
              className="ml-2 px-3 py-0.5 bg-white/20 hover:bg-white/30 rounded-full text-xs font-medium transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              Shop Now
            </a>
          )}
        </div>
        <button
          onClick={() => dismiss(reminder.id)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/80 hover:text-white focus:outline-none p-1"
          aria-label="Dismiss reminder"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </motion.div>
    </AnimatePresence>
  );
};

export default ReminderBanner;
