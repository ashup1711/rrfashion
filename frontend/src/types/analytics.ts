export interface RentStats {
  rentOrders: number;
  rentRevenue: number;
  depositCollected: number;
  lateFees: number;
  damageCharges: number;
}

export interface PurchaseStats {
  purchaseOrders: number;
  purchaseRevenue: number;
  cashOrders: number;
  cashRevenue: number;
  onlineOrders: number;
  onlineRevenue: number;
}

export interface ChannelBreakdown {
  online: { orders: number; revenue: number };
  offline: { orders: number; revenue: number };
}

export interface AbandonedCarts {
  abandoned: number;
  recovered: number;
  recoveryRate: number;
}

export interface DashboardData {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  totalCustomers: number;
  totalProducts: number;
  activeRentals: number;
  revenueGrowth: number | null;
  ordersGrowth: number | null;
  abandonedCarts: AbandonedCarts;
  rentStats: RentStats;
  purchaseStats: PurchaseStats;
  channelBreakdown: ChannelBreakdown;
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
