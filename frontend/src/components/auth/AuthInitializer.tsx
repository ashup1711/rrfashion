import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import LoadingSpinner from '../common/LoadingSpinner';

interface AuthInitializerProps {
  children: React.ReactNode;
}

// REQ-FE-BP-002: hard timeout so a stuck admin-auth call cannot leave a
// permanent spinner (blocking first paint on admin routes).
const TIMEOUT_MS = 10_000;

export const AuthInitializer = ({ children }: AuthInitializerProps) => {
  const [isValidating, setIsValidating] = useState(true);
  const location = useLocation();
  const initializeAdminAuth = useAuthStore((state) => state.initializeAdminAuth);

  useEffect(() => {
    let cancelled = false;
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
    // both success (setting adminUser) and failure (clearing admin state).
    // REQ-FE-BP-002: race the admin validation against a 10s timeout so a
    // stuck request lets the UI proceed (to login) instead of a spinner forever.
    (async () => {
      try {
        await Promise.race([
          initializeAdminAuth(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('admin auth timeout')), TIMEOUT_MS),
          ),
        ]);
      } catch (error) {
        console.warn('Admin auth validation timed out/failed:', error);
        // Let UI proceed to login — App's three-state auth check handles the redirect.
        if (!cancelled) {
          useAuthStore.getState().setAdminAuthValidated(true);
        }
      } finally {
        if (!cancelled) setIsValidating(false);
      }
    })();

    return () => {
      cancelled = true;
    };
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
