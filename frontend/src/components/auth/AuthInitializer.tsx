import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import LoadingSpinner from '../common/LoadingSpinner';

interface AuthInitializerProps {
  children: React.ReactNode;
}

export const AuthInitializer = ({ children }: AuthInitializerProps) => {
  const [isValidating, setIsValidating] = useState(true);
  const location = useLocation();
  const initializeAdminAuth = useAuthStore((state) => state.initializeAdminAuth);

  useEffect(() => {
    const isAdminRoute = location.pathname.startsWith('/admin');
    const isAdminLogin = location.pathname === '/admin/login';

    // Skip admin auth validation for non-admin routes and the login page itself
    if (!isAdminRoute || isAdminLogin) {
      setIsValidating(false);
      return;
    }

    // If already validated (e.g. by App.tsx's useEffect), skip the call
    if (useAuthStore.getState().isAdminAuthValidated) {
      setIsValidating(false);
      return;
    }

    // Use the store's initializeAdminAuth which calls adminGetMe() and handles
    // both success (setting adminUser) and failure (clearing admin state)
    initializeAdminAuth().finally(() => {
      setIsValidating(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Mount only

  if (isValidating && location.pathname.startsWith('/admin') && location.pathname !== '/admin/login') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner label="Validating session..." />
      </div>
    );
  }

  return <>{children}</>;
};
