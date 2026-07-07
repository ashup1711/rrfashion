import { useMutation } from '@tanstack/react-query';
import { createGuestUser, guestCheckout } from '../api/guest';
import { storeGuestCredentials } from '../utils/persistentStorage';
import type { GuestCheckoutData } from '../api/guest';

export const useGuestAuth = () => {
  return useMutation({
    mutationFn: createGuestUser,
    onSuccess: (data) => {
      storeGuestCredentials(data.guestId, data.guestToken);
    },
  });
};

export const useGuestCheckout = () => {
  return useMutation({
    mutationFn: (data: GuestCheckoutData) => guestCheckout(data),
  });
};
