import { Suspense, useEffect } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { AppRoutes } from './routes';
import Layout from './components/layout/Layout';
import AdminLayout from './components/layout/AdminLayout';
import LoadingSpinner from './components/common/LoadingSpinner';
import { useAuthStore } from './store/authStore';
import { ensureGuestSession } from './utils/guestSessionInit';

const App = () => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isAdminLogin = location.pathname === '/admin/login';
  const { isAdminAuthenticated, isAdminAuthValidated } = useAuthStore();

  // Initialize guest session on app load (only if not authenticated)
  useEffect(() => {
    ensureGuestSession();
  }, []);

  // Admin login page has its own minimal layout
  if (isAdminLogin) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <AppRoutes />
      </Suspense>
    );
  }

  // Admin routes get the admin layout with sidebar
  if (isAdminRoute) {
    if (!isAdminAuthenticated || !isAdminAuthValidated) {
      return <Navigate to="/admin/login" state={{ from: location }} replace />;
    }
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <AdminLayout>
          <AppRoutes />
        </AdminLayout>
      </Suspense>
    );
  }

  // Customer routes get the regular layout
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Layout>
        <AppRoutes />
      </Layout>
    </Suspense>
  );
};

export default App;
