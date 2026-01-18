import React from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';

/**
 * Handles Google OAuth authentication errors
 * Displays error message and provides link back to login
 */
export const AuthErrorPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const errorMessage =
    searchParams.get('message') || 'Đăng nhập bằng Google thất bại';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Đăng nhập thất bại
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {errorMessage}
          </p>
        </div>

        <div className="mt-8 space-y-4">
          <div className="rounded-md bg-red-50 p-4 border border-red-200">
            <div className="text-sm text-red-800">{errorMessage}</div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate('/auth/login')}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Thử lại đăng nhập
            </button>

            <Link
              to="/auth/login"
              className="text-center text-sm text-gray-600 hover:text-primary"
            >
              ← Quay lại trang đăng nhập
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
