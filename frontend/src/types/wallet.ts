export interface WalletBalance {
  balance: number;
  totalCredited: number;
  totalDebited: number;
  lastTransactionAt?: string;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  type: 'CREDIT' | 'DEBIT' | 'REFUND' | 'PAYMENT' | 'WITHDRAWAL';
  amount: number;
  balanceAfter: number;
  description: string;
  referenceId?: string;
  referenceType?: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface WalletTransactionFilters {
  page?: number;
  limit?: number;
  type?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
}
