import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useUserStore } from '../../store/userStore';
import { cartStore } from '../../store/cartStore';
import { authService } from '../../services/auth.service';

/**
 * Handles successful Google OAuth authentication
 * Receives token from query parameter and stores it
 */
export const AuthSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setUser = useUserStore((state) => state.setUser);
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      // No token provided, redirect to login
      navigate('/auth/login?error=no_token');
      return;
    }

    // Store token
    localStorage.setItem('token', token);

    // Fetch user profile to get full user data
    const initializeAuth = async () => {
      try {
        // Fetch user profile from API using the token
        const user = await authService.getProfile();
        
        if (!user) {
          navigate('/auth/login?error=user_not_found');
          return;
        }

        setUser(user);

        // Clear cart when user logs in via Google OAuth
        // This ensures each user starts with a fresh cart
        cartStore.clearCart();

        // Redirect based on user role
        if (user.role === 'admin') {
          navigate('/admin');
        } else if (
          user.role === 'staff' ||
          user.role === 'waiter' ||
          user.role === 'kitchen'
        ) {
          navigate('/staff');
        } else {
          navigate('/customer/menu');
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        navigate('/auth/login?error=auth_failed');
      }
    };

    initializeAuth();
  }, [token, navigate, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-gray-600">Đang xử lý đăng nhập...</p>
      </div>
    </div>
  );
};
