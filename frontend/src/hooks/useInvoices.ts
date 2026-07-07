import { useQuery } from '@tanstack/react-query';
import { getAll, getById } from '../api/invoices';
import { QUERY_KEYS } from '../utils/constants';
import type { InvoiceFilters } from '../types/invoice';

export const useInvoices = (filters?: InvoiceFilters) => {
  return useQuery({
    queryKey: [QUERY_KEYS.invoices, filters],
    queryFn: () => getAll(filters),
  });
};

export const useInvoice = (id: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.invoice, id],
    queryFn: () => getById(id),
    enabled: !!id,
  });
};
