import { useEffect, useState, useCallback } from 'react';
import { initializeGuestSession, refreshGuestSession, getGuestToken } from '../utils/guestSession';

export function useGuestSession() {
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // REQ-FE-BP-002: guest init must never throw into render or block first paint.
  // The effect is fire-and-forget; a failed backend guest-session call degrades
  // to local-first cart/wishlist (stores fall back to localStorage).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await initializeGuestSession();
      } catch (err) {
        console.warn('Guest session init failed (non-blocking):', err);
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to initialize guest session';
          setError(message);
        }
      } finally {
        if (!cancelled) setInitialized(true);
      }
    })();
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
