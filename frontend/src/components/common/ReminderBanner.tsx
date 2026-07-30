import { useState, useEffect, useCallback } from 'react';
import { useActiveReminders } from '../../hooks/useReminders';
import type { SiteReminderActive } from '../../types/reminder';

const DISMISSED_KEY_PREFIX = 'reminder_dismissed_';

const ReminderBanner = () => {
  const { data: reminders, isLoading, error } = useActiveReminders();
  const [visibleReminders, setVisibleReminders] = useState<SiteReminderActive[]>([]);

  useEffect(() => {
    if (!reminders || reminders.length === 0) {
      setVisibleReminders([]);
      return;
    }

    // Filter out dismissed reminders
    const undismissed = reminders.filter(
      (r) => !sessionStorage.getItem(`${DISMISSED_KEY_PREFIX}${r.id}`),
    );
    setVisibleReminders(undismissed);
  }, [reminders]);

  const dismiss = useCallback((id: string) => {
    sessionStorage.setItem(`${DISMISSED_KEY_PREFIX}${id}`, 'true');
    setVisibleReminders((prev) => prev.filter((r) => r.id !== id));
  }, []);

  // Graceful: loading, error, empty → render nothing
  if (isLoading || error || visibleReminders.length === 0) {
    return null;
  }

  // Show the most recent active reminder (ordered by startDate desc from API)
  const reminder = visibleReminders[0];

  return (
    <div className="bg-primary-600 text-white text-center text-sm py-2 px-4 relative">
      {reminder.linkUrl ? (
        <a
          href={reminder.linkUrl}
          className="hover:underline inline-block mr-6"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="font-semibold">{reminder.title}: </span>
          {reminder.message}
        </a>
      ) : (
        <span className="inline-block mr-6">
          <span className="font-semibold">{reminder.title}: </span>
          {reminder.message}
        </span>
      )}
      <button
        onClick={() => dismiss(reminder.id)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/80 hover:text-white focus:outline-none"
        aria-label="Dismiss reminder"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

export default ReminderBanner;
