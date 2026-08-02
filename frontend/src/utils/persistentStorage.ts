/**
 * Persistent storage utility — localStorage ONLY.
 *
 * REQ-SEC-FE-002 / SEC-16: guest credentials are kept in localStorage (the PWA
 * needs persistence across reloads, and `guest_cart_items` already lives there),
 * but the previous non-httpOnly 1-year cookie mirror is REMOVED — it was an
 * unnecessary XSS/CSRF surface. The guest token is a low-privilege, frequently
 * rotated JWT; customer/admin access tokens are already held in httpOnly
 * cookies and never touch this module.
 */

/**
 * Stores a value in localStorage (no cookie mirror — REQ-SEC-FE-002).
 */
export function setPersistentItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // localStorage might be disabled
  }
}

/**
 * Gets a value from localStorage.
 */
export function getPersistentItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    // localStorage might be disabled
  }
  return null;
}

/**
 * Removes a value from localStorage.
 */
export function removePersistentItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // localStorage might be disabled
  }
}

/**
 * REQ-SEC-FE-002: purge legacy cookie mirrors written by older builds.
 * The 1-year `SameSite=Lax` cookies (guest_token / guest_session_id /
 * guest_id) are an avoidable XSS/CSRF surface — delete them once at startup.
 */
export function purgeLegacyGuestCookies(): void {
  if (typeof document === 'undefined') return;
  ['guest_token', 'guest_session_id', 'guest_id'].forEach((name) => {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  });
}

/**
 * Guest credentials keys
 */
export const GUEST_KEYS = {
  ID: 'guest_id',
  TOKEN: 'guest_token',
} as const;

/**
 * Store guest credentials persistently (localStorage only)
 */
export function storeGuestCredentials(guestId: string, guestToken: string): void {
  setPersistentItem(GUEST_KEYS.ID, guestId);
  setPersistentItem(GUEST_KEYS.TOKEN, guestToken);
}

/**
 * Get guest credentials from storage
 */
export function getGuestCredentials(): { guestId: string; guestToken: string } | null {
  const guestId = getPersistentItem(GUEST_KEYS.ID);
  const guestToken = getPersistentItem(GUEST_KEYS.TOKEN);

  if (guestId && guestToken) {
    return { guestId, guestToken };
  }
  return null;
}

/**
 * Clear guest credentials
 */
export function clearGuestCredentials(): void {
  removePersistentItem(GUEST_KEYS.ID);
  removePersistentItem(GUEST_KEYS.TOKEN);
}
