export interface DashboardData {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  totalCustomers: number;
  totalProducts: number;
  activeRentals: number;
  revenueGrowth: number;
  ordersGrowth: number;
}

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  orders: number;
  label?: string;
}

export interface TopProduct {
  id: string;
  name: string;
  totalSold: number;
  totalRevenue: number;
  image?: string;
}

export interface DashboardFilters {
  view?: 'day' | 'week' | 'month' | 'year';
  startDate?: string;
  endDate?: string;
  storeId?: string;
}

export interface TopSeller {
  id: string;
  name: string;
  count: number;
  revenue: number;
  type: 'product' | 'brand' | 'fabric';
}
