import { Suspense, useEffect } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { AppRoutes } from './routes';
import Layout from './components/layout/Layout';
import AdminLayout from './components/layout/AdminLayout';
import LoadingSpinner from './components/common/LoadingSpinner';
import PageTransition from './components/common/PageTransition';
import { RouteChangeWatcher } from './components/common/RouteChangeWatcher';
import { useAuthStore } from './store/authStore';
import { useGuestSession } from './hooks/useGuestSession';
import { setGlobalNavigator } from './utils/navigation';

const App = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isAdminLogin = location.pathname === '/admin/login';
  const { isAdminAuthenticated, isAdminAuthValidated, initializeAuth, initializeAdminAuth } = useAuthStore();

  // REQ-FE-RC-003: register the router navigator so axios interceptors /
  // stores can SPA-navigate on 401 instead of hard-redirecting.
  setGlobalNavigator(navigate);

  // Initialize guest session on app load (fire-and-forget, does not block rendering)
  useGuestSession();

  // On mount, verify auth state from HTTP-only cookies via /auth/me
  // Only initialize admin auth on admin routes to avoid unnecessary /admin/auth/me calls
  useEffect(() => {
    initializeAuth();
    if (location.pathname.startsWith('/admin')) {
      initializeAdminAuth();
    }
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
    // Three-state auth check:
    // 1. No token at all → redirect to login
    if (!isAdminAuthenticated) {
      return <Navigate to="/admin/login" state={{ from: location }} replace />;
    }
    // 2. Token exists but not yet validated → show loading spinner, let AuthInitializer handle it
    if (!isAdminAuthValidated) {
      return (
        <Suspense fallback={<LoadingSpinner />}>
          <div className="min-h-screen flex items-center justify-center">
            <LoadingSpinner label="Verifying your session..." />
          </div>
        </Suspense>
      );
    }
    // 3. Token validated and authenticated → show admin layout
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <AdminLayout>
          <AppRoutes />
        </AdminLayout>
      </Suspense>
    );
  }

  // Customer routes get the regular layout with page transitions
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Layout>
        <PageTransition>
          {/* REQ-FE-RC-002: cancel + refetch route-scoped queries on every SPA route change */}
          <RouteChangeWatcher />
          <AppRoutes />
        </PageTransition>
      </Layout>
    </Suspense>
  );
};

export default App;
