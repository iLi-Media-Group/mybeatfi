import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiresProducer?: boolean;
  requiresClient?: boolean;
  requiresAdmin?: boolean;
}

export function ProtectedRoute({ 
  children, 
  requiresProducer = false,
  requiresClient = false,
  requiresAdmin = false
}: ProtectedRouteProps) {
  const { user, loading, accountType } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isAdmin = user.email && ['knockriobeats@gmail.com', 'info@mybeatfi.io', 'derykbanks@yahoo.com', 'knockriobeats2@gmail.com'].includes(user.email);

  // Admins can access all routes
  if (isAdmin) {
    return <>{children}</>;
  }

  // Route-specific checks for non-admin users
  if (requiresAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requiresProducer && accountType !== 'producer') {
    return <Navigate to="/dashboard" replace />;
  }

  if (requiresClient && accountType !== 'client') {
    return <Navigate to="/producer/dashboard" replace />;
  }

  return <>{children}</>;
}
