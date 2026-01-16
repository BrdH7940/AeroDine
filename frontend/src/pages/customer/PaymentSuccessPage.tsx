import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '../../services/api';

export const PaymentSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [orderId, setOrderId] = useState<number | null>(null);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    
    if (sessionId) {
      // In a real app, you might want to verify the session with your backend
      // For now, we'll just show success and redirect after a delay
      setIsLoading(false);
      
      // Redirect to order tracking after 3 seconds
      const timer = setTimeout(() => {
        // Try to get orderId from URL or localStorage if available
        const storedOrderId = localStorage.getItem('lastOrderId');
        if (storedOrderId) {
          navigate(`/customer/orders/${storedOrderId}`);
        } else {
          navigate('/customer/menu');
        }
      }, 3000);

      return () => clearTimeout(timer);
    } else {
      // No session ID, redirect to menu
      navigate('/customer/menu');
    }
  }, [searchParams, navigate]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#eba157] mx-auto mb-4"></div>
          <p className="text-gray-600">Processing payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Payment Successful!</h1>
            <p className="text-gray-600">
              Your order has been placed and payment has been processed successfully.
            </p>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Redirecting to your order tracking page...
            </p>
            <button
              onClick={() => {
                const storedOrderId = localStorage.getItem('lastOrderId');
                if (storedOrderId) {
                  navigate(`/customer/orders/${storedOrderId}`);
                } else {
                  navigate('/customer/menu');
                }
              }}
              className="w-full px-6 py-3 bg-[#eba157] text-white rounded-lg hover:bg-[#d88f3f] transition-colors duration-200 font-medium"
            >
              View Order
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
