import { useQuery } from '@tanstack/react-query';
import { getDashboard, getRevenueChart, getTopProducts } from '../api/analytics';
import { QUERY_KEYS } from '../utils/constants';
import type { DashboardFilters } from '../types/analytics';

export const useDashboard = (query?: DashboardFilters) => {
  return useQuery({
    queryKey: [QUERY_KEYS.analyticsDashboard, query],
    queryFn: () => getDashboard(query),
  });
};

export const useRevenueChart = (query?: DashboardFilters) => {
  return useQuery({
    queryKey: [QUERY_KEYS.analyticsRevenue, query],
    queryFn: () => getRevenueChart(query),
  });
};

export const useTopProducts = (query?: DashboardFilters) => {
  return useQuery({
    queryKey: [QUERY_KEYS.analyticsTopProducts, query],
    queryFn: () => getTopProducts(query),
  });
};
