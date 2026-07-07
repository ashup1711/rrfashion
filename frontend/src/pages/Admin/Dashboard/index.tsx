import { Link } from 'react-router-dom';
import Card from '../../../components/ui/Card';
import { ROUTES } from '../../../utils/constants';

interface StatCard {
  title: string;
  value: string;
  description: string;
  link: string;
  color: string;
}

const stats: StatCard[] = [
  {
    title: 'Total Products',
    value: '--',
    description: 'Products in catalog',
    link: ROUTES.ADMIN_PRODUCTS,
    color: 'bg-blue-500',
  },
  {
    title: 'Active Orders',
    value: '--',
    description: 'Orders to fulfill',
    link: '#',
    color: 'bg-green-500',
  },
  {
    title: 'Active Stores',
    value: '--',
    description: 'Store locations',
    link: ROUTES.ADMIN_STORES,
    color: 'bg-purple-500',
  },
  {
    title: 'Admin Users',
    value: '--',
    description: 'Staff accounts',
    link: ROUTES.ADMIN_USERS,
    color: 'bg-amber-500',
  },
];

const quickLinks = [
  { label: 'Add Product', path: ROUTES.ADMIN_PRODUCT_NEW, description: 'Create a new product with variants' },
  { label: 'Manage Categories', path: ROUTES.ADMIN_CATEGORIES, description: 'Organize your category tree' },
  { label: 'View Inventory', path: ROUTES.ADMIN_INVENTORY, description: 'Check stock across stores' },
  { label: 'Manage Roles', path: ROUTES.ADMIN_ROLES, description: 'Configure permissions' },
];

const AdminDashboard = () => {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Welcome to R R Fashion admin panel
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <Link key={stat.title} to={stat.link} className="block">
            <Card className="hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
                </div>
                <div className={`w-3 h-3 rounded-full ${stat.color} mt-1`} />
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Links */}
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

      {/* Recent Activity Placeholder */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Recent Activity</h2>
        <p className="text-sm text-gray-500">
          Recent admin actions and system events will appear here once the system is fully operational.
        </p>
      </Card>
    </div>
  );
};

export default AdminDashboard;
