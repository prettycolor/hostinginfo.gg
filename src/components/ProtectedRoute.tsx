import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireVerified?: boolean;
}

export function ProtectedRoute({ children, requireVerified = true }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication.
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Authenticating...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated.
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Force username completion for account creation paths (including OAuth signups).
  const hasUsername = Boolean(user.profileName && user.profileName.trim().length > 0);
  if (!hasUsername && location.pathname !== '/choose-username') {
    return <Navigate to="/choose-username" state={{ from: location }} replace />;
  }

  if (requireVerified && !user.emailVerified) {
    const redirectTarget = `${location.pathname}${location.search || ''}`;
    return <Navigate to={`/verify-email-required?redirect=${encodeURIComponent(redirectTarget)}`} replace />;
  }

  return <>{children}</>;
}
