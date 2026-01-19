import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import { useUserStore } from '../../store/userStore';
import { apiConfig } from '../../config/api.config';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setUser = useUserStore((state) => state.setUser);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = () => {
    // Redirect to backend Google OAuth endpoint
    window.location.href = `${apiConfig.baseUrl}/auth/google`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authService.login({ email, password });
      setUser(response.user);
      
      // Check for returnUrl from query params
      const returnUrl = searchParams.get('returnUrl');
      
      // Redirect based on user role or returnUrl
      if (returnUrl) {
        navigate(returnUrl);
      } else if (response.user.role === 'admin') {
        navigate('/admin');
      } else if (response.user.role === 'staff' || response.user.role === 'waiter' || response.user.role === 'kitchen') {
        navigate('/staff');
      } else {
        navigate('/customer/menu');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Đăng nhập thất bại. Vui lòng thử lại.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9F7F2] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-[#36454F]">
            Đăng nhập vào AeroDine
          </h2>
          <p className="mt-2 text-center text-sm text-[#36454F]/70">
            Hoặc{' '}
            <Link
              to="/auth/register"
              className="font-medium text-[#8A9A5B] hover:text-[#6B7A4A]"
            >
              đăng ký tài khoản mới
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4 border border-red-200">
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-[#8A9A5B]/30 placeholder-[#36454F]/50 text-[#36454F] rounded-t-md focus:outline-none focus:ring-[#8A9A5B] focus:border-[#8A9A5B] focus:z-10 sm:text-sm bg-white"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Mật khẩu
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-[#8A9A5B]/30 placeholder-[#36454F]/50 text-[#36454F] rounded-b-md focus:outline-none focus:ring-[#8A9A5B] focus:border-[#8A9A5B] focus:z-10 sm:text-sm bg-white"
                placeholder="Mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#D4AF37] hover:bg-[#B8941F] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D4AF37] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </div>

          <div className="text-center">
            <Link
              to="/auth/forgot-password"
              className="text-sm text-[#8A9A5B] hover:text-[#6B7A4A]"
            >
              Quên mật khẩu?
            </Link>
          </div>
        </form>

        {/* Google Login Divider */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#8A9A5B]/30"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-[#F9F7F2] text-[#36454F]/70">Hoặc</span>
            </div>
          </div>

          <div className="mt-6">
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 py-2 px-4 border border-[#8A9A5B]/30 rounded-md shadow-sm bg-white text-sm font-medium text-[#36454F] hover:bg-[#F9F7F2] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8A9A5B] transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>Đăng nhập bằng Google</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
