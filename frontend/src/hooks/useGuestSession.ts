import { useEffect, useState } from 'react';
import { initializeGuestSession } from '../utils/guestSession';

export function useGuestSession() {
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    initializeGuestSession()
      .then(() => {
        if (!cancelled) setInitialized(true);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { initialized, error };
}
