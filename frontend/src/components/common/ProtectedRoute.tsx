import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useUserStore } from '../../store/userStore';
import { UserRole } from '@aerodine/shared-types';
import UnauthorizedPage from '../../pages/UnauthorizedPage';
import Layout from './Layout';

interface ProtectedRouteProps {
  requiredRole?: UserRole;
}

/**
 * ProtectedRoute component
 * Checks if user has the required role to access the route
 * If not, shows UnauthorizedPage
 */
export default function ProtectedRoute({ requiredRole = UserRole.ADMIN }: ProtectedRouteProps) {
  const { user, isAuthenticated, initializeAuth } = useUserStore();

  // Ensure auth is initialized
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Check if we have token in localStorage (even if store not updated yet)
  const hasToken = localStorage.getItem('token');

  // If no token at all, redirect to login
  if (!hasToken) {
    return <Navigate to="/auth/login" replace />;
  }

  // If not authenticated or no user, redirect to login
  if (!isAuthenticated || !user) {
    return <Navigate to="/auth/login" replace />;
  }

  // If user doesn't have the required role, show unauthorized page
  if (user.role !== requiredRole) {
    return <UnauthorizedPage />;
  }

  // User has the required role, render the protected content
  return <Outlet />;
}

/**
 * AdminLayout component
 * Wraps Layout with admin role check
 * Shows UnauthorizedPage if user is not admin
 */
export function AdminLayout() {
  const { user, isAuthenticated, initializeAuth } = useUserStore();

  // Ensure auth is initialized
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Check if we have token in localStorage
  const hasToken = localStorage.getItem('token');
  const userFromStorage = (() => {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  })();

  // If no token at all, redirect to login
  if (!hasToken) {
    return <Navigate to="/auth/login" replace />;
  }

  // If we have token but no user in store, try to use user from localStorage
  const currentUser = user || userFromStorage;

  // If we have token but still no user, redirect to login (invalid state)
  if (!currentUser) {
    return <Navigate to="/auth/login" replace />;
  }

  // Normalize role to uppercase for comparison (handles both 'admin' and 'ADMIN')
  const userRole = typeof currentUser.role === 'string' ? currentUser.role.toUpperCase() : currentUser.role;
  
  // If user is not admin, show unauthorized page
  if (userRole !== UserRole.ADMIN) {
    return <UnauthorizedPage />;
  }

  // User is admin, render the Layout with nested routes
  return <Layout />;
}
