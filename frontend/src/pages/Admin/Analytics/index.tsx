import { useState, useMemo } from 'react';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import { useDashboard, useRevenueChart, useTopProducts } from '../../../hooks/useAnalytics';
import type { DashboardFilters } from '../../../types/analytics';

const viewOptions = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
];

const AnalyticsDashboard = () => {
  const [view, setView] = useState<DashboardFilters['view']>('month');

  const { data: dashboard, isLoading: dashLoading, error: dashError } = useDashboard({ view });
  const { data: revenueData, isLoading: revenueLoading } = useRevenueChart({ view });
  const { data: topProducts, isLoading: topLoading } = useTopProducts({ view });

  const maxRevenue = useMemo(() => {
    if (!revenueData || revenueData.length === 0) return 0;
    return Math.max(...revenueData.map((d) => d.revenue));
  }, [revenueData]);

  if (dashLoading || revenueLoading || topLoading) {
    return <LoadingSpinner size="lg" label="Loading analytics..." />;
  }

  if (dashError) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <p className="text-sm text-red-700">
          Error loading analytics: {(dashError as Error).message}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="mt-1 text-sm text-gray-600">
            Business performance overview
          </p>
        </div>
        <div className="flex gap-2">
          {viewOptions.map((opt) => (
            <Button
              key={opt.value}
              variant={view === opt.value ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setView(opt.value as DashboardFilters['view'])}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <p className="text-sm font-medium text-gray-600">Total Revenue</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            ₹{(dashboard?.totalRevenue ?? 0).toLocaleString()}
          </p>
          {dashboard?.revenueGrowth !== undefined && (
            <p
              className={`text-xs mt-1 ${
                dashboard.revenueGrowth >= 0
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}
            >
              {dashboard.revenueGrowth >= 0 ? '+' : ''}
              {dashboard.revenueGrowth.toFixed(1)}% vs previous period
            </p>
          )}
        </Card>
        <Card>
          <p className="text-sm font-medium text-gray-600">Total Orders</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {dashboard?.totalOrders ?? 0}
          </p>
          {dashboard?.ordersGrowth !== undefined && (
            <p
              className={`text-xs mt-1 ${
                dashboard.ordersGrowth >= 0
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}
            >
              {dashboard.ordersGrowth >= 0 ? '+' : ''}
              {dashboard.ordersGrowth.toFixed(1)}% vs previous period
            </p>
          )}
        </Card>
        <Card>
          <p className="text-sm font-medium text-gray-600">
            Average Order Value
          </p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            ₹{(dashboard?.averageOrderValue ?? 0).toLocaleString()}
          </p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-gray-600">
            Active Rentals
          </p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {dashboard?.activeRentals ?? 0}
          </p>
        </Card>
      </div>

      {/* Revenue Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Revenue Trend
          </h2>
          {revenueData && revenueData.length > 0 ? (
            <div className="relative h-64">
              {/* Simple CSS bar chart */}
              <div className="flex items-end gap-2 h-52">
                {revenueData.map((point, idx) => (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <div
                      className="w-full bg-primary-500 rounded-t transition-all duration-300 hover:bg-primary-600"
                      style={{
                        height: `${maxRevenue > 0 ? (point.revenue / maxRevenue) * 100 : 0}%`,
                        minHeight: point.revenue > 0 ? '4px' : '0',
                      }}
                      title={`${point.label || point.date}: ₹${point.revenue.toLocaleString()}`}
                    />
                    <span className="text-[10px] text-gray-500 truncate w-full text-center">
                      {point.label ||
                        new Date(point.date).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                    </span>
                  </div>
                ))}
              </div>
              {revenueData.length > 0 && (
                <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                  <span>0</span>
                  <span>₹{maxRevenue.toLocaleString()}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500 py-8 text-center">
              No revenue data available for this period
            </p>
          )}
        </Card>

        {/* Top Products */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Top Products
          </h2>
          {topProducts && topProducts.length > 0 ? (
            <div className="space-y-4">
              {topProducts.slice(0, 5).map((product, idx) => (
                <div
                  key={product.id}
                  className="flex items-center gap-3"
                >
                  <span className="text-sm font-bold text-gray-400 w-5">
                    {idx + 1}
                  </span>
                  <div className="w-8 h-8 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                        N/A
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {product.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {product.totalSold} sold · ₹
                      {product.totalRevenue.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 py-8 text-center">
              No product data available
            </p>
          )}
        </Card>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <p className="text-sm font-medium text-gray-600">Total Customers</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {dashboard?.totalCustomers ?? 0}
          </p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-gray-600">Total Products</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {dashboard?.totalProducts ?? 0}
          </p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-gray-600">Total Revenue</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            ₹{(dashboard?.totalRevenue ?? 0).toLocaleString()}
          </p>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
