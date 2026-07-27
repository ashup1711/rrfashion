export const GUEST_SESSION_KEY = 'guest_session_id';
export const GUEST_TOKEN_KEY = 'guest_token';

export function getGuestToken(): string | null {
  return localStorage.getItem(GUEST_TOKEN_KEY);
}

export function setGuestToken(token: string): void {
  localStorage.setItem(GUEST_TOKEN_KEY, token);
}

export function clearGuestToken(): void {
  localStorage.removeItem(GUEST_TOKEN_KEY);
}

function fallbackUuidV4(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  let id = '';
  for (let i = 0; i < 32; i++) {
    const r = Math.floor(Math.random() * 16);
    id += r.toString(16);
    if (i === 7 || i === 11 || i === 15 || i === 19) id += '-';
  }
  return id;
}

export function generateGuestSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return fallbackUuidV4();
}

import { getPersistentItem, setPersistentItem, removePersistentItem } from './persistentStorage';

export function getOrCreateGuestSessionId(): string {
  const existing = getPersistentItem(GUEST_SESSION_KEY);
  if (existing) return existing;
  const fresh = generateGuestSessionId();
  setPersistentItem(GUEST_SESSION_KEY, fresh);
  return fresh;
}

export function setGuestSessionId(id: string): void {
  setPersistentItem(GUEST_SESSION_KEY, id);
}

export function clearGuestSessionId(): void {
  removePersistentItem(GUEST_SESSION_KEY);
}

import { apiClient } from '../api/client';
import { useGuestStore } from '../store/guestStore';
import { useCartStore } from '../store/cartStore';

/**
 * Initialize guest session on first load.
 * If a guest_token already exists, returns it. Otherwise calls POST /guest/start
 * to create a new backend guest session and stores the returned token + session ID.
 * Updates both localStorage AND Zustand reactive stores so cart queries fire correctly.
 */
export async function initializeGuestSession(): Promise<string> {
  const existingToken = getGuestToken();
  if (existingToken) return existingToken;

  const { data } = await apiClient.post('/guest/start');
  setGuestToken(data.guestToken);
  setGuestSessionId(data.guestSessionId);
  // Also update the reactive Zustand store so subscribers (like useCart) react immediately
  useGuestStore.getState().setGuestSessionId(data.guestSessionId);
  useCartStore.getState().setGuestCart(true);
  return data.guestToken;
}

/**
 * Refresh an expiring guest session by calling POST /guest/refresh.
 * Returns the new guest token and updates stored values.
 */
export async function refreshGuestSession(): Promise<string | null> {
  const currentToken = getGuestToken();
  if (!currentToken) return null;

  try {
    const { data } = await apiClient.post('/guest/refresh');
    if (data.guestToken) {
      setGuestToken(data.guestToken);
    }
    if (data.guestSessionId) {
      setGuestSessionId(data.guestSessionId);
      // Also update the reactive Zustand store
      useGuestStore.getState().setGuestSessionId(data.guestSessionId);
    }
    return data.guestToken || null;
  } catch (error) {
    console.warn('Failed to refresh guest session:', error);
    return null;
  }
}
