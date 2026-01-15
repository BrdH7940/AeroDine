import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../services/api';
import { useSocket } from '../../hooks/useSocket';
import { formatVND } from '../../utils/currency';
import { BottomNavigation } from '../../components/customer';
import { useCartStore } from '../../store/cartStore';

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
  PENDING: 'Received',
  IN_PROGRESS: 'Preparing',
  COMPLETED: 'Ready',
  CANCELLED: 'Cancelled',
  SERVED: 'Served',
};

const orderStatusFlow = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'SERVED'];

export const OrderTrackingPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { tableId } = useCartStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const socket = useSocket();

  useEffect(() => {
    loadOrders();

    // Subscribe to order updates via WebSocket
    if (socket) {
      const handleOrderUpdate = (updatedOrder: Order) => {
        setOrders((prev) => {
          const index = prev.findIndex((o) => o.id === updatedOrder.id);
          if (index >= 0) {
            const newOrders = [...prev];
            newOrders[index] = updatedOrder;
            return newOrders;
          }
          return prev;
        });
      };

      // Subscribe to all order updates for this table
      socket.on('order:update', handleOrderUpdate);

      return () => {
        socket.off('order:update', handleOrderUpdate);
      };
    }
  }, [socket]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      // If we have a specific orderId, load that order and find related orders
      if (orderId) {
        const response = await apiClient.get(`/orders/${orderId}`);
        const order = response.data;
        
        // Load all orders for the same table
        const allOrdersResponse = await apiClient.get('/orders');
        const tableOrders = allOrdersResponse.data.filter(
          (o: Order) => o.table?.id === order.table?.id && !['CANCELLED'].includes(o.status)
        );
        setOrders(tableOrders.sort((a: Order, b: Order) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ));
      } else if (tableId) {
        // Load all orders for the table
        const allOrdersResponse = await apiClient.get('/orders');
        const tableOrders = allOrdersResponse.data.filter(
          (o: Order) => o.table?.id === tableId && !['CANCELLED'].includes(o.status)
        );
        setOrders(tableOrders.sort((a: Order, b: Order) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ));
      } else {
        // Try to get last order from localStorage
        const lastOrderId = localStorage.getItem('lastOrderId');
        if (lastOrderId) {
          const response = await apiClient.get(`/orders/${lastOrderId}`);
          const order = response.data;
          const allOrdersResponse = await apiClient.get('/orders');
          const tableOrders = allOrdersResponse.data.filter(
            (o: Order) => o.table?.id === order.table?.id && !['CANCELLED'].includes(o.status)
          );
          setOrders(tableOrders.sort((a: Order, b: Order) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          ));
        }
      }
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentStatusIndex = (status: string) => {
    return orderStatusFlow.indexOf(status);
  };

  const getEstimatedTime = (status: string) => {
    if (status === 'IN_PROGRESS') return '~10 min';
    return '';
  };

  const getTotalAmount = () => {
    return orders.reduce((sum, order) => sum + Number(order.totalAmount), 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#eba157]"></div>
            <p className="mt-4 text-gray-600">Loading orders...</p>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">No orders found</h2>
            <button
              onClick={() => navigate('/customer/menu')}
              className="px-6 py-3 bg-[#eba157] text-white rounded-lg hover:bg-[#d88f3f] transition-colors duration-200 font-medium"
            >
              Back to Menu
            </button>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  const currentTable = orders[0]?.table;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-800">Smart Restaurant</span>
            {currentTable && (
              <span className="px-3 py-1 bg-[#eba157] text-white rounded-full text-sm font-medium">
                Table {currentTable.name || currentTable.id}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Your Orders</h2>

        <div className="space-y-4 mb-6">
          {orders.map((order) => {
            const currentStatusIndex = getCurrentStatusIndex(order.status);
            const orderTime = new Date(order.createdAt).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div key={order.id} className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="mb-3">
                  <h3 className="font-semibold text-gray-800">
                    Order #{order.id} - {orderTime}
                  </h3>
                </div>

                {/* Status Flow */}
                <div className="mb-4 space-y-2">
                  {orderStatusFlow.map((status, index) => {
                    const isCompleted = index <= currentStatusIndex;
                    const isCurrent = index === currentStatusIndex;
                    const statusLabel = statusLabels[status] || status;

                    return (
                      <div key={status} className="flex items-center gap-2">
                        <div className="flex items-center gap-2 min-w-[120px]">
                          {isCompleted ? (
                            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>
                          )}
                          <span className={`text-sm ${isCompleted ? 'text-gray-800' : 'text-gray-400'}`}>
                            {statusLabel}
                          </span>
                          {isCurrent && (
                            <span className="text-xs text-[#eba157] font-medium">← Current</span>
                          )}
                        </div>
                        {isCurrent && status === 'IN_PROGRESS' && (
                          <div className="flex items-center gap-1 text-sm text-blue-600">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{getEstimatedTime(status)}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Order Items */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-2">Items:</p>
                  <div className="space-y-1">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 text-sm text-gray-600">
                        <span>• {item.name} x{item.quantity}</span>
                        {item.status === 'COMPLETED' && (
                          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                        {item.status === 'IN_PROGRESS' && (
                          <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Total */}
        <div className="mb-6 border-t border-gray-200 pt-4">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-gray-800">Total so far:</span>
            <span className="text-lg font-bold text-gray-800">{formatVND(getTotalAmount())}</span>
          </div>
        </div>

        {/* Request Bill Button */}
        <button
          onClick={() => {
            // Navigate to payment/bill page
            navigate('/customer/menu');
          }}
          className="w-full px-6 py-3 bg-[#eba157] text-white rounded-lg hover:bg-[#d88f3f] transition-colors duration-200 font-medium"
        >
          Request Bill
        </button>
      </div>

      <BottomNavigation />
    </div>
  );
};
