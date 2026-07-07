import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { adminGetMe } from '../../api/admin-auth';
import type { AdminUser } from '../../types/admin';
import LoadingSpinner from '../common/LoadingSpinner';

interface AuthInitializerProps {
  children: React.ReactNode;
}

export const AuthInitializer = ({ children }: AuthInitializerProps) => {
  const [isValidating, setIsValidating] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { setAdminAuth, adminLogout } = useAuthStore();

  useEffect(() => {
    const validateAuth = async () => {
      const adminToken = localStorage.getItem('admin_token');
      const isAdminRoute = location.pathname.startsWith('/admin');
      const isAdminLogin = location.pathname === '/admin/login';

      if (!isAdminRoute || isAdminLogin) {
        setIsValidating(false);
        return;
      }

      if (!adminToken) {
        setIsValidating(false);
        return;
      }

      if (useAuthStore.getState().isAdminAuthValidated) {
        setIsValidating(false);
        return;
      }

      try {
        const response = await adminGetMe();
        const adminUser: AdminUser = {
          id: response.id,
          name: response.name,
          email: response.email,
          roleId: response.role.id,
          role: response.role,
          storeIds: response.storeIds ?? [],
          isActive: response.isActive,
        };
        setAdminAuth(
          adminUser,
          response.permissions,
          adminToken,
          localStorage.getItem('admin_refresh_token') || undefined,
        );
      } catch {
        adminLogout();
        navigate('/admin/login', { state: { from: location }, replace: true });
      } finally {
        setIsValidating(false);
      }
    };

    validateAuth();
  }, [location.pathname]);

  if (isValidating && location.pathname.startsWith('/admin') && location.pathname !== '/admin/login') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner label="Validating session..." />
      </div>
    );
  }

  return <>{children}</>;
};
