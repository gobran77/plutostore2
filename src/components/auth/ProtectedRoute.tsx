import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Check for admin session
    const adminSession = localStorage.getItem('admin_session');
    if (adminSession) {
      try {
        const parsed = JSON.parse(adminSession);
        if (parsed && parsed.id) {
          setIsAuthenticated(true);
          setIsAdmin(true);
        }
      } catch (e) {
        console.error('Error parsing admin session:', e);
      }
    }
    
    // Check for customer session (if not requiring admin)
    if (!requireAdmin) {
      const customerSession = localStorage.getItem('customer_session');
      if (customerSession) {
        try {
          const parsed = JSON.parse(customerSession);
          if (parsed && parsed.id) {
            setIsAuthenticated(true);
          }
        } catch (e) {
          console.error('Error parsing customer session:', e);
        }
      }
    }
    
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
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/customer" state={{ from: location }} replace />;
  }

  // If not authenticated at all
  if (!isAuthenticated) {
    return <Navigate to="/customer" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
