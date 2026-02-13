import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const location = useLocation();

  useEffect(() => {
    let hasAdminSession = false;
    let hasCustomerSession = false;

    // Check admin session validity.
    const adminSession = localStorage.getItem('admin_session');
    if (adminSession) {
      try {
        const parsed = JSON.parse(adminSession);
        if (parsed && parsed.id) {
          hasAdminSession = true;
        }
      } catch (e) {
        console.error('Error parsing admin session:', e);
      }
    }

    // Check customer session validity.
    const customerSession = localStorage.getItem('customer_session');
    if (customerSession) {
      try {
        const parsed = JSON.parse(customerSession);
        if (parsed && parsed.id) {
          hasCustomerSession = true;
        }
      } catch (e) {
        console.error('Error parsing customer session:', e);
      }
    }

    setIsAdminAuthenticated(hasAdminSession);
    setIsAuthenticated(requireAdmin ? hasAdminSession : hasCustomerSession);
    setIsChecking(false);
  }, [requireAdmin]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If requiring admin and user is not admin
  if (requireAdmin && !isAdminAuthenticated) {
    return <Navigate to="/customer" state={{ from: location }} replace />;
  }

  // If not authenticated at all
  if (!isAuthenticated) {
    return <Navigate to="/customer" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
