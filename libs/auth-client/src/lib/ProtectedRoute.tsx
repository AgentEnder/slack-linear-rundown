/**
 * Protected Route Component
 * Redirects to login if user is not authenticated
 */

import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        {fallback || <div>Loading...</div>}
      </div>
    );
  }

  if (!isAuthenticated) {
    // Store the attempted URL for redirect after login
    return <Navigate to="/login" replace state={{ from: window.location.pathname }} />;
  }

  return <>{children}</>;
}
