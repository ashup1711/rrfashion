import apiClient from './client';
import { adminClient } from './admin-client';
import type { PaginatedResponse, PaginationParams } from '../types/api';
import type { WalletBalance, WalletTransaction, WalletTransactionFilters } from '../types/wallet';

export interface AdminWalletStats {
  totalBalance: number;
  totalCredited: number;
  totalDebited: number;
  totalUsers: number;
}

export interface AdminWalletTransactionFilters extends PaginationParams {
  type?: string;
}

export const getBalance = async (): Promise<WalletBalance> => {
  const { data } = await apiClient.get<WalletBalance>('/wallet/balance');
  return data;
};

export const getTransactions = async (
  filters?: WalletTransactionFilters,
): Promise<PaginatedResponse<WalletTransaction>> => {
  const { data } = await apiClient.get<PaginatedResponse<WalletTransaction>>(
    '/wallet/transactions',
    { params: filters },
  );
  return data;
};

export const adminGetWalletStats = async (): Promise<AdminWalletStats> => {
  const { data } = await adminClient.get<AdminWalletStats>('/admin/wallet/stats');
  return data;
};

export const adminGetWalletTransactions = async (
  filters?: AdminWalletTransactionFilters,
): Promise<PaginatedResponse<WalletTransaction>> => {
  const { data } = await adminClient.get<PaginatedResponse<WalletTransaction>>(
    '/admin/wallet/transactions',
    { params: filters },
  );
  return data;
};
