import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import ErrorBoundary from '../components/common/ErrorBoundary';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { ProtectedRoute } from '../components/common/ProtectedRoute';

// Customer pages
const Home = lazy(() => import('../pages/Home'));
const Shop = lazy(() => import('../pages/Shop'));
const ProductDetail = lazy(() => import('../pages/ProductDetail'));
const Cart = lazy(() => import('../pages/Cart'));
const Checkout = lazy(() => import('../pages/Checkout'));
const Orders = lazy(() => import('../pages/Orders'));
const Login = lazy(() => import('../pages/Auth/Login'));
const Register = lazy(() => import('../pages/Auth/Register'));
const Profile = lazy(() => import('../pages/Profile'));
const Sale = lazy(() => import('../pages/Sale'));
const OrderDetail = lazy(() => import('../pages/Orders/OrderDetail'));
const GuestCheckout = lazy(() => import('../pages/Checkout/GuestCheckout'));
const Wishlist = lazy(() => import('../pages/Wishlist'));
const Contact = lazy(() => import('../pages/Contact'));
const FAQ = lazy(() => import('../pages/FAQ'));
const ShippingReturns = lazy(() => import('../pages/ShippingReturns'));
const Compare = lazy(() => import('../pages/Compare'));

// Admin pages
const AdminLogin = lazy(() => import('../pages/Admin/Login'));
const AdminDashboard = lazy(() => import('../pages/Admin/Dashboard'));
const AdminProductList = lazy(() => import('../pages/Admin/Products/ProductList'));
const AdminProductForm = lazy(() => import('../pages/Admin/Products/ProductForm'));
const AdminCategoryList = lazy(() => import('../pages/Admin/Categories/CategoryList'));
const AdminBrandList = lazy(() => import('../pages/Admin/Brands/BrandList'));
const AdminRoleList = lazy(() => import('../pages/Admin/Roles/RoleList'));
const AdminUserList = lazy(() => import('../pages/Admin/Users/UserList'));
const AdminStoreList = lazy(() => import('../pages/Admin/Stores/StoreList'));
const AdminInventoryView = lazy(() => import('../pages/Admin/Inventory/InventoryView'));
const AdminReviews = lazy(() => import('../pages/Admin/Reviews'));
const AdminRentals = lazy(() => import('../pages/Admin/Rentals'));
const AdminInvoices = lazy(() => import('../pages/Admin/Invoices'));
const AdminAnalytics = lazy(() => import('../pages/Admin/Analytics'));
const AdminWallet = lazy(() => import('../pages/Admin/Wallet'));
const AdminCoupons = lazy(() => import('../pages/Admin/Coupons'));
const AdminInquiries = lazy(() => import('../pages/Admin/Inquiries'));
const AdminReports = lazy(() => import('../pages/Admin/Reports'));
const AdminOrders = lazy(() => import('../pages/Admin/Orders'));
const AdminOrderDetail = lazy(() => import('../pages/Admin/Orders/OrderDetail'));
const AdminConflicts = lazy(() => import('../pages/Admin/Conflicts/ConflictList'));
const PosPage = lazy(() => import('../pages/POS/PosPage'));

export const AppRoutes = () => {
  return (
    <ErrorBoundary>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-neutral-white">
          <LoadingSpinner size="lg" label="Loading page..." />
        </div>
      }>
        <Routes>
          {/* Customer Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/register" element={<Register />} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/sale" element={<Sale />} />
          <Route path="/orders/:id" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
          <Route path="/checkout/guest" element={<GuestCheckout />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/shipping-returns" element={<ShippingReturns />} />
          <Route path="/compare" element={<Compare />} />

          {/* POS Route */}
          <Route path="/pos" element={<PosPage />} />

          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/products" element={<ProtectedRoute requireAdmin><AdminProductList /></ProtectedRoute>} />
          <Route path="/admin/products/new" element={<ProtectedRoute requireAdmin><AdminProductForm /></ProtectedRoute>} />
          <Route path="/admin/products/:id/edit" element={<ProtectedRoute requireAdmin><AdminProductForm /></ProtectedRoute>} />
          <Route path="/admin/categories" element={<ProtectedRoute requireAdmin><AdminCategoryList /></ProtectedRoute>} />
          <Route path="/admin/brands" element={<ProtectedRoute requireAdmin><AdminBrandList /></ProtectedRoute>} />
          <Route path="/admin/roles" element={<ProtectedRoute requireAdmin><AdminRoleList /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute requireAdmin><AdminUserList /></ProtectedRoute>} />
          <Route path="/admin/stores" element={<ProtectedRoute requireAdmin><AdminStoreList /></ProtectedRoute>} />
          <Route path="/admin/inventory" element={<ProtectedRoute requireAdmin><AdminInventoryView /></ProtectedRoute>} />
          <Route path="/admin/reviews" element={<ProtectedRoute requireAdmin><AdminReviews /></ProtectedRoute>} />
          <Route path="/admin/rentals" element={<ProtectedRoute requireAdmin><AdminRentals /></ProtectedRoute>} />
          <Route path="/admin/invoices" element={<ProtectedRoute requireAdmin><AdminInvoices /></ProtectedRoute>} />
          <Route path="/admin/analytics" element={<ProtectedRoute requireAdmin><AdminAnalytics /></ProtectedRoute>} />
          <Route path="/admin/wallet" element={<ProtectedRoute requireAdmin><AdminWallet /></ProtectedRoute>} />
          <Route path="/admin/coupons" element={<ProtectedRoute requireAdmin><AdminCoupons /></ProtectedRoute>} />
          <Route path="/admin/inquiries" element={<ProtectedRoute requireAdmin><AdminInquiries /></ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute requireAdmin><AdminReports /></ProtectedRoute>} />
          <Route path="/admin/orders" element={<ProtectedRoute requireAdmin><AdminOrders /></ProtectedRoute>} />
          <Route path="/admin/orders/:id" element={<ProtectedRoute requireAdmin><AdminOrderDetail /></ProtectedRoute>} />
          <Route path="/admin/pos/conflicts" element={<ProtectedRoute requireAdmin><AdminConflicts /></ProtectedRoute>} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
};
