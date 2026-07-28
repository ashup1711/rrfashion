import { useEffect, useState, useCallback } from 'react';
import { initializeGuestSession, refreshGuestSession, getGuestToken } from '../utils/guestSession';

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

  const refresh = useCallback(async () => {
    try {
      const newToken = await refreshGuestSession();
      return !!newToken;
    } catch {
      return false;
    }
  }, []);

  // Check if guest token exists (initialized or previously stored)
  const hasGuestToken = !!getGuestToken();

  return { initialized, error, refresh, hasGuestToken, isReady: initialized || hasGuestToken };
}
