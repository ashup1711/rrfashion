import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import { useDashboard } from '../../../hooks/useAnalytics';
import { formatCurrencyCompact } from '../../../utils/formatCurrency';
import { ROUTES } from '../../../utils/constants';
import type { DashboardFilters } from '../../../types/analytics';

const viewOptions = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
];

const quickLinks = [
  { label: 'Add Product', path: ROUTES.ADMIN_PRODUCT_NEW, description: 'Create a new product with variants' },
  { label: 'Manage Categories', path: ROUTES.ADMIN_CATEGORIES, description: 'Organize your category tree' },
  { label: 'View Inventory', path: ROUTES.ADMIN_INVENTORY, description: 'Check stock across stores' },
  { label: 'Manage Roles', path: ROUTES.ADMIN_ROLES, description: 'Configure permissions' },
];

const AdminDashboard = () => {
  const [view, setView] = useState<DashboardFilters['view']>('month');

  const { data: dashboard, isLoading, error } = useDashboard({ view });

  const totalChannelOrders = useMemo(() => {
    if (!dashboard?.channelBreakdown) return 0;
    return (
      dashboard.channelBreakdown.online.orders +
      dashboard.channelBreakdown.offline.orders
    );
  }, [dashboard]);

  const totalChannelRevenue = useMemo(() => {
    if (!dashboard?.channelBreakdown) return 0;
    return (
      dashboard.channelBreakdown.online.revenue +
      dashboard.channelBreakdown.offline.revenue
    );
  }, [dashboard]);

  const onlineOrderPercent = useMemo(() => {
    if (totalChannelOrders === 0) return 0;
    return (
      (dashboard?.channelBreakdown.online.orders ?? 0) / totalChannelOrders
    ) * 100;
  }, [dashboard, totalChannelOrders]);

  const onlineRevenuePercent = useMemo(() => {
    if (totalChannelRevenue === 0) return 0;
    return (
      (dashboard?.channelBreakdown.online.revenue ?? 0) / totalChannelRevenue
    ) * 100;
  }, [dashboard, totalChannelRevenue]);

  if (isLoading) {
    return <LoadingSpinner size="lg" label="Loading dashboard..." />;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <p className="text-sm text-red-700">
          Error loading dashboard: {(error as Error).message}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Welcome to R R Fashion admin panel
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

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <Link to={ROUTES.ADMIN_PRODUCTS} className="block">
          <Card className="hover:shadow-md transition-shadow">
            <p className="text-sm font-medium text-gray-600">Total Products</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              {dashboard?.totalProducts ?? 0}
            </p>
            <p className="text-xs text-gray-500 mt-1">Products in catalog</p>
          </Card>
        </Link>

        <Card className="hover:shadow-md transition-shadow">
          <p className="text-sm font-medium text-gray-600">Total Revenue</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {formatCurrencyCompact(dashboard?.totalRevenue)}
          </p>
          {dashboard?.revenueGrowth != null && (
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

        <Card className="hover:shadow-md transition-shadow">
          <p className="text-sm font-medium text-gray-600">Total Orders</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {dashboard?.totalOrders ?? 0}
          </p>
          {dashboard?.ordersGrowth != null && (
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

        <Card className="hover:shadow-md transition-shadow">
          <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {formatCurrencyCompact(dashboard?.averageOrderValue)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Per order average</p>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <p className="text-sm font-medium text-gray-600">Active Rentals</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {dashboard?.activeRentals ?? 0}
          </p>
          <p className="text-xs text-gray-500 mt-1">Currently active</p>
        </Card>
      </div>

      {/* Rent / Purchase Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Rentals</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Rent Orders</span>
              <span className="text-sm font-medium text-gray-900">
                {dashboard?.rentStats.rentOrders ?? 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Rent Revenue</span>
              <span className="text-sm font-medium text-gray-900">
                {formatCurrencyCompact(dashboard?.rentStats.rentRevenue)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Deposits Collected</span>
              <span className="text-sm font-medium text-gray-900">
                {formatCurrencyCompact(dashboard?.rentStats.depositCollected)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Late Fees</span>
              <span className="text-sm font-medium text-gray-900">
                {formatCurrencyCompact(dashboard?.rentStats.lateFees)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Damage Charges</span>
              <span className="text-sm font-medium text-gray-900">
                {formatCurrencyCompact(dashboard?.rentStats.damageCharges)}
              </span>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Purchases</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Purchase Orders</span>
              <span className="text-sm font-medium text-gray-900">
                {dashboard?.purchaseStats.purchaseOrders ?? 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Purchase Revenue</span>
              <span className="text-sm font-medium text-gray-900">
                {formatCurrencyCompact(dashboard?.purchaseStats.purchaseRevenue)}
              </span>
            </div>

            <div className="pt-3 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                Payment Split
              </p>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Cash Orders</span>
                <span className="text-sm font-medium text-gray-900">
                  {dashboard?.purchaseStats.cashOrders ?? 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Cash Revenue</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatCurrencyCompact(dashboard?.purchaseStats.cashRevenue)}
                </span>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-sm text-gray-600">Online Orders</span>
                <span className="text-sm font-medium text-gray-900">
                  {dashboard?.purchaseStats.onlineOrders ?? 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Online Revenue</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatCurrencyCompact(dashboard?.purchaseStats.onlineRevenue)}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Channel Breakdown */}
      <Card className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Channel Breakdown
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Orders Split */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase mb-2">
              Orders
            </p>
            <div className="flex items-center gap-4 mb-2">
              <div className="flex-1">
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${onlineOrderPercent}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                Online:{' '}
                <span className="font-medium text-gray-900">
                  {dashboard?.channelBreakdown.online.orders ?? 0}
                </span>
              </span>
              <span className="text-gray-600">
                Offline:{' '}
                <span className="font-medium text-gray-900">
                  {dashboard?.channelBreakdown.offline.orders ?? 0}
                </span>
              </span>
            </div>
          </div>

          {/* Revenue Split */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase mb-2">
              Revenue
            </p>
            <div className="flex items-center gap-4 mb-2">
              <div className="flex-1">
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-300"
                    style={{ width: `${onlineRevenuePercent}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                Online:{' '}
                <span className="font-medium text-gray-900">
                  {formatCurrencyCompact(dashboard?.channelBreakdown.online.revenue)}
                </span>
              </span>
              <span className="text-gray-600">
                Offline:{' '}
                <span className="font-medium text-gray-900">
                  {formatCurrencyCompact(dashboard?.channelBreakdown.offline.revenue)}
                </span>
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Cart Recovery */}
      <Card className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Cart Recovery</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">Abandoned</p>
            <p className="text-2xl font-bold text-gray-900">
              {dashboard?.abandonedCarts.abandoned ?? 0}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Recovered</p>
            <p className="text-2xl font-bold text-gray-900">
              {dashboard?.abandonedCarts.recovered ?? 0}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Recovery Rate</p>
            <p className="text-2xl font-bold text-gray-900">
              {dashboard?.abandonedCarts.recoveryRate ?? 0}%
            </p>
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className="block p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md hover:border-primary-300 transition-all"
            >
              <h3 className="font-medium text-gray-900">{link.label}</h3>
              <p className="text-sm text-gray-500 mt-1">{link.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
