import { useQuery } from '@tanstack/react-query';
import { getBalance, getTransactions, adminGetWalletStats, adminGetWalletTransactions } from '../api/wallet';
import { QUERY_KEYS } from '../utils/constants';
import type { WalletTransactionFilters } from '../types/wallet';
import type { AdminWalletTransactionFilters } from '../api/wallet';

export const useWalletBalance = () => {
  return useQuery({
    queryKey: [QUERY_KEYS.walletBalance],
    queryFn: getBalance,
    staleTime: 1000 * 60 * 2,
  });
};

export const useWalletTransactions = (
  filters?: WalletTransactionFilters,
) => {
  return useQuery({
    queryKey: [QUERY_KEYS.walletTransactions, filters],
    queryFn: () => getTransactions(filters),
  });
};

export const useAdminWalletStats = () => {
  return useQuery({
    queryKey: [QUERY_KEYS.adminWalletStats],
    queryFn: adminGetWalletStats,
    staleTime: 1000 * 60 * 2,
  });
};

export const useAdminWalletTransactions = (
  filters?: AdminWalletTransactionFilters,
) => {
  return useQuery({
    queryKey: [QUERY_KEYS.adminWalletTransactions, filters],
    queryFn: () => adminGetWalletTransactions(filters),
  });
};
