import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import { useUserStore } from '../../store/userStore';
import { cartStore } from '../../store/cartStore';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const setUser = useUserStore((state) => state.setUser);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    if (formData.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    setLoading(true);

    try {
      const response = await authService.register({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
      });
      setUser(response.user);
      
      // Clear cart when user registers
      // This ensures new user starts with a fresh cart
      cartStore.clearCart();
      
      navigate('/customer/menu');
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Đăng ký thất bại. Vui lòng thử lại.',
      );
    } finally {
      setLoading(false);
    }
  };

  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [passwordValid, setPasswordValid] = useState({
    minLength: false,
    hasUppercase: false,
    hasNumber: false,
  });
  const [passwordsMatch, setPasswordsMatch] = useState(false);

  useEffect(() => {
    // Check password requirements
    setPasswordValid({
      minLength: formData.password.length >= 8,
      hasUppercase: /[A-Z]/.test(formData.password),
      hasNumber: /\d/.test(formData.password),
    });
    setPasswordsMatch(
      formData.password.length > 0 &&
      formData.confirmPassword.length > 0 &&
      formData.password === formData.confirmPassword
    );
  }, [formData.password, formData.confirmPassword]);

  useEffect(() => {
    // Check email availability (debounced)
    if (formData.email && formData.email.includes('@')) {
      const timeoutId = setTimeout(() => {
        // In a real app, this would call an API
        setEmailAvailable(formData.email !== 'existing@example.com');
      }, 500);
      return () => clearTimeout(timeoutId);
    } else {
      setEmailAvailable(null);
    }
  }, [formData.email]);

  return (
    <div className="min-h-screen bg-[#F9F7F2] py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate('/auth/login')}
              className="text-[#8A9A5B] hover:text-[#6B7A4A] font-medium transition-colors"
            >
              ← Back
            </button>
            <h1 className="text-xl font-bold text-[#36454F]">Create Account</h1>
            <div></div>
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4 border border-red-200">
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}

          {/* Full Name */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-[#36454F] mb-2">
              <svg className="w-5 h-5 text-[#8A9A5B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Full Name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              className="w-full px-4 py-3 border border-[#8A9A5B]/30 rounded-lg focus:ring-2 focus:ring-[#8A9A5B] focus:border-[#8A9A5B] bg-white text-[#36454F] placeholder-[#36454F]/50"
              placeholder="John Doe"
              value={formData.fullName}
              onChange={handleChange}
            />
          </div>

          {/* Email */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-[#36454F] mb-2">
              <svg className="w-5 h-5 text-[#8A9A5B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email
            </label>
            <div className="relative">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full px-4 py-3 border border-[#8A9A5B]/30 rounded-lg focus:ring-2 focus:ring-[#8A9A5B] focus:border-[#8A9A5B] pr-10 bg-white text-[#36454F] placeholder-[#36454F]/50"
                placeholder="john@example.com"
                value={formData.email}
                onChange={handleChange}
              />
              {emailAvailable === true && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <svg className="w-5 h-5 text-[#8A9A5B]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
            {emailAvailable === true && (
              <p className="mt-1 text-sm text-[#8A9A5B] flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Email is available
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-[#36454F] mb-2">
              <svg className="w-5 h-5 text-[#8A9A5B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              className="w-full px-4 py-3 border border-[#8A9A5B]/30 rounded-lg focus:ring-2 focus:ring-[#8A9A5B] focus:border-[#8A9A5B] bg-white text-[#36454F] placeholder-[#36454F]/50"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
            />
            <div className="mt-2 space-y-1">
              {passwordValid.minLength && (
                <p className="text-sm text-[#8A9A5B] flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Min 8 characters
                </p>
              )}
              {passwordValid.hasUppercase && (
                <p className="text-sm text-[#8A9A5B] flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Contains uppercase
                </p>
              )}
              {passwordValid.hasNumber && (
                <p className="text-sm text-[#8A9A5B] flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Contains number
                </p>
              )}
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-[#36454F] mb-2">
              <svg className="w-5 h-5 text-[#8A9A5B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              className="w-full px-4 py-3 border border-[#8A9A5B]/30 rounded-lg focus:ring-2 focus:ring-[#8A9A5B] focus:border-[#8A9A5B] bg-white text-[#36454F] placeholder-[#36454F]/50"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={handleChange}
            />
            {passwordsMatch && (
              <p className="mt-1 text-sm text-[#8A9A5B] flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Passwords match
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 bg-[#D4AF37] text-white rounded-lg hover:bg-[#B8941F] transition-colors duration-200 font-medium disabled:bg-[#8A9A5B]/30 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>

          {/* Terms */}
          <p className="text-center text-sm text-[#36454F]/70">
            By signing up, you agree to our{' '}
            <Link to="/terms" className="text-[#8A9A5B] hover:text-[#6B7A4A] hover:underline">
              Terms & Privacy Policy
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};
