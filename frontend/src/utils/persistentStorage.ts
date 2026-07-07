/**
 * Persistent storage utility that uses both localStorage and cookies
 * for better persistence across browser cache clears.
 */

const COOKIE_MAX_AGE_DAYS = 365; // 1 year

function setCookie(name: string, value: string, days: number = COOKIE_MAX_AGE_DAYS): void {
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function getCookie(name: string): string | null {
  const nameEQ = `${name}=`;
  const cookies = document.cookie.split(';');
  for (let i = 0; i < cookies.length; i++) {
    let cookie = cookies[i].trim();
    if (cookie.indexOf(nameEQ) === 0) {
      return decodeURIComponent(cookie.substring(nameEQ.length));
    }
  }
  return null;
}

function deleteCookie(name: string): void {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

/**
 * Stores a value in both localStorage and cookies for persistence
 */
export function setPersistentItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // localStorage might be disabled
  }
  setCookie(key, value);
}

/**
 * Gets a value from localStorage, falling back to cookies
 */
export function getPersistentItem(key: string): string | null {
  // Try localStorage first
  try {
    const localValue = localStorage.getItem(key);
    if (localValue) return localValue;
  } catch {
    // localStorage might be disabled
  }
  
  // Fall back to cookies
  return getCookie(key);
}

/**
 * Removes a value from both localStorage and cookies
 */
export function removePersistentItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // localStorage might be disabled
  }
  deleteCookie(key);
}

/**
 * Guest credentials keys
 */
export const GUEST_KEYS = {
  ID: 'guest_id',
  TOKEN: 'guest_token',
} as const;

/**
 * Store guest credentials persistently
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
