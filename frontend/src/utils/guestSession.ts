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

/**
 * Initialize guest session on first load.
 * If a guest_token already exists, returns it. Otherwise calls POST /guest/start
 * to create a new backend guest session and stores the returned token + session ID.
 */
export async function initializeGuestSession(): Promise<string> {
  const existingToken = getGuestToken();
  if (existingToken) return existingToken;

  const { data } = await apiClient.post('/guest/start');
  setGuestToken(data.guestToken);
  setGuestSessionId(data.guestSessionId);
  return data.guestToken;
}
