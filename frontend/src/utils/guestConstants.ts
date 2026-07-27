/**
 * Constants for guest session management.
 * Extracted to a separate file to break the circular dependency:
 *   utils/guestSession.ts ↔ store/guestStore.ts
 * Both modules can import from here without creating a cycle.
 */
export const GUEST_SESSION_KEY = 'guest_session_id';
export const GUEST_TOKEN_KEY = 'guest_token';
