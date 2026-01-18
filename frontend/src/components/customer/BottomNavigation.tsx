import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCartStore } from '../../store/cartStore';

export const BottomNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { getItemCount } = useCartStore();

  const isActive = (path: string) => {
    return location.pathname.includes(path);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#1a1a1a] border-t border-gray-800/50 z-50 backdrop-blur-xl">
      <div className="px-4">
        <div className="flex items-center justify-around py-3">
          <button
            onClick={() => navigate('/customer/menu')}
            className={`flex flex-col items-center gap-1 px-4 py-2 transition-all duration-200 ${
              isActive('/customer/menu') ? 'text-amber-600' : 'text-gray-400'
            }`}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            <span className="text-xs font-medium">Menu</span>
          </button>

          <button
            onClick={() => navigate('/customer/cart')}
            className={`flex flex-col items-center gap-1 px-4 py-2 transition-all duration-200 relative ${
              isActive('/customer/cart') ? 'text-amber-600' : 'text-gray-400'
            }`}
          >
            <div className="relative">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              {getItemCount() > 0 && (
                <span className="absolute -top-2 -right-2 bg-amber-700 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {getItemCount()}
                </span>
              )}
            </div>
            <span className="text-xs font-medium">Cart{getItemCount() > 0 ? `(${getItemCount()})` : ''}</span>
          </button>

          <button
            onClick={() => {
              const lastOrderId = localStorage.getItem('lastOrderId');
              if (lastOrderId) {
                navigate(`/customer/orders/${lastOrderId}`);
              } else {
                navigate('/customer/menu');
              }
            }}
            className={`flex flex-col items-center gap-1 px-4 py-2 transition-all duration-200 ${
              isActive('/customer/orders') ? 'text-amber-600' : 'text-gray-400'
            }`}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span className="text-xs font-medium">Orders</span>
          </button>
        </div>
      </div>
    </div>
  );
};
