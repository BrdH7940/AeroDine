import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../services/api';
import { useSocket } from '../../hooks/useSocket';

interface OrderItem {
  id: number;
  name: string;
  quantity: number;
  pricePerUnit: number;
  status: string;
  note?: string;
}

interface Order {
  id: number;
  status: string;
  totalAmount: number;
  guestCount: number;
  note?: string;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
  table?: {
    id: number;
    name: string;
  };
}

const statusLabels: Record<string, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export const OrderTrackingPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const socket = useSocket();

  useEffect(() => {
    if (!orderId) {
      navigate('/customer/menu');
      return;
    }

    loadOrder();

    // Subscribe to order updates via WebSocket
    if (socket && orderId) {
      socket.on(`order:${orderId}:update`, (updatedOrder: Order) => {
        setOrder(updatedOrder);
      });

      return () => {
        socket.off(`order:${orderId}:update`);
      };
    }
  }, [orderId, socket]);

  const loadOrder = async () => {
    if (!orderId) return;

    setLoading(true);
    try {
      const response = await apiClient.get(`/orders/${orderId}`);
      setOrder(response.data);
    } catch (error) {
      console.error('Failed to load order:', error);
      alert('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Order not found</h2>
          <button
            onClick={() => navigate('/customer/menu')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium"
          >
            Back to Menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => navigate('/customer/menu')}
            className="text-blue-600 hover:text-blue-700 font-medium mb-4"
          >
            ← Back to Menu
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Order #{order.id}</h1>
          {order.table && (
            <p className="text-gray-600 mt-2">Table: {order.table.name}</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Order Status</h2>
            <span
              className={`px-4 py-2 rounded-full font-medium ${statusColors[order.status] || statusColors.PENDING}`}
            >
              {statusLabels[order.status] || order.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <span className="font-medium">Order Date:</span>{' '}
              {new Date(order.createdAt).toLocaleString()}
            </div>
            <div>
              <span className="font-medium">Last Updated:</span>{' '}
              {new Date(order.updatedAt).toLocaleString()}
            </div>
            <div>
              <span className="font-medium">Guests:</span> {order.guestCount}
            </div>
            <div>
              <span className="font-medium">Total Amount:</span> ${Number(order.totalAmount).toFixed(2)}
            </div>
          </div>

          {order.note && (
            <div className="mt-4 p-3 bg-gray-50 rounded">
              <span className="font-medium text-gray-700">Special Instructions: </span>
              <span className="text-gray-600">{order.note}</span>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Order Items</h2>
          <div className="space-y-4">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-0">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-gray-800">{item.name}</span>
                    <span className="text-sm text-gray-500">x{item.quantity}</span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${statusColors[item.status] || statusColors.PENDING}`}
                    >
                      {statusLabels[item.status] || item.status}
                    </span>
                  </div>
                  {item.note && (
                    <p className="text-sm text-gray-500 italic mt-1">Note: {item.note}</p>
                  )}
                </div>
                <span className="font-semibold text-gray-800">
                  ${(Number(item.pricePerUnit) * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex justify-between text-xl font-bold text-gray-800">
              <span>Total</span>
              <span>${Number(order.totalAmount).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
