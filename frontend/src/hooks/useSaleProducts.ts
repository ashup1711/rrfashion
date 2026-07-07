import { useQuery } from '@tanstack/react-query';
import { getSaleProducts } from '../api/sale';
import { QUERY_KEYS } from '../utils/constants';
import type { SaleFilters } from '../api/sale';

export const useSaleProducts = (filters?: SaleFilters) => {
  return useQuery({
    queryKey: [QUERY_KEYS.saleProducts, filters],
    queryFn: () => getSaleProducts(filters),
  });
};
