import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdminAuthenticated, isAuthenticated } = useAuthStore();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (requireAdmin && !isAdminAuthenticated && !hasRedirected.current) {
      hasRedirected.current = true;
      navigate('/admin/login', { state: { from: location }, replace: true });
    }
    if (!requireAdmin && !isAuthenticated && !hasRedirected.current) {
      hasRedirected.current = true;
      navigate('/auth/login', { state: { from: location }, replace: true });
    }
    return () => { hasRedirected.current = false; };
  }, [requireAdmin, isAdminAuthenticated, isAuthenticated, location, navigate]);

  if (requireAdmin && !isAdminAuthenticated) return null;
  if (!requireAdmin && !isAuthenticated) return null;
  return <>{children}</>;
};
