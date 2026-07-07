import adminClient from './admin-client';
import type { DashboardData, RevenueDataPoint, TopProduct, DashboardFilters } from '../types/analytics';

export const getDashboard = async (
  query?: DashboardFilters,
): Promise<DashboardData> => {
  const { data } = await adminClient.get<DashboardData>('/admin/analytics/dashboard', {
    params: query,
  });
  return data;
};

export const getRevenueChart = async (
  query?: DashboardFilters,
): Promise<RevenueDataPoint[]> => {
  const { data } = await adminClient.get<RevenueDataPoint[]>(
    '/admin/analytics/revenue-chart',
    { params: query },
  );
  return data;
};

export const getTopProducts = async (
  query?: DashboardFilters,
): Promise<TopProduct[]> => {
  const { data } = await adminClient.get<TopProduct[]>(
    '/admin/analytics/top-products',
    { params: query },
  );
  return data;
};
