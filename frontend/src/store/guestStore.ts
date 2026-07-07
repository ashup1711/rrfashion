import { create } from 'zustand';
import { getPersistentItem, setPersistentItem, removePersistentItem } from '../utils/persistentStorage';
import { GUEST_SESSION_KEY } from '../utils/guestSession';

interface GuestState {
  guestSessionId: string;
  setGuestSessionId: (id: string) => void;
  clearGuestSession: () => void;
}

function load(): string {
  return getPersistentItem(GUEST_SESSION_KEY) || '';
}

export const useGuestStore = create<GuestState>((set) => ({
  guestSessionId: load(),

  setGuestSessionId: (id) => {
    setPersistentItem(GUEST_SESSION_KEY, id);
    set({ guestSessionId: id });
  },

  clearGuestSession: () => {
    removePersistentItem(GUEST_SESSION_KEY);
    set({ guestSessionId: '' });
  },
}));
