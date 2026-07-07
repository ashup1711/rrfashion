import { setGuestToken, GUEST_SESSION_KEY } from './guestSession';
import apiClient from '../api/client';

// Cache the initialization promise to prevent duplicate requests
let initPromise: Promise<boolean> | null = null;

export async function ensureGuestSession(): Promise<boolean> {
  // If already authenticated, no need for guest session
  if (localStorage.getItem('auth_token') || localStorage.getItem('admin_token')) {
    return false;
  }

  // If we already have a guest token, no need to fetch
  if (localStorage.getItem('guest_token')) {
    return true;
  }

  // If we're already initializing, return the existing promise
  if (initPromise) {
    return initPromise;
  }

  // Create a new promise for this initialization
  initPromise = (async () => {
    try {
      // Try to create a valid guest session on the backend
      const response = await apiClient.post('/guest/start');
      const { guestToken, guestSessionId } = response.data;

      if (guestToken) {
        setGuestToken(guestToken);
      }
      if (guestSessionId) {
        localStorage.setItem(GUEST_SESSION_KEY, guestSessionId);
      }
      return true;
    } catch (error) {
      // If backend session creation fails, log and continue
      // The user will still be able to browse, but API calls requiring auth may fail
      console.warn('Failed to create backend guest session', error);
      return false;
    } finally {
      // Reset the promise so future calls can re-initialize if needed
      initPromise = null;
    }
  })();

  return initPromise;
}
