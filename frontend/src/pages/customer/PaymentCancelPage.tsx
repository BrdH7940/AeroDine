import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export const PaymentCancelPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Payment Cancelled</h1>
            <p className="text-gray-600">
              Your payment was cancelled. Your order has been saved but not yet paid.
            </p>
          </div>

          <div className="space-y-4">
            {orderId && (
              <p className="text-sm text-gray-500">
                Order ID: {orderId}
              </p>
            )}
            <button
              onClick={() => navigate('/customer/cart')}
              className="w-full px-6 py-3 bg-[#eba157] text-white rounded-lg hover:bg-[#d88f3f] transition-colors duration-200 font-medium"
            >
              Return to Cart
            </button>
            <button
              onClick={() => navigate('/customer/menu')}
              className="w-full px-6 py-2 text-[#eba157] hover:text-[#d88f3f] font-medium"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
