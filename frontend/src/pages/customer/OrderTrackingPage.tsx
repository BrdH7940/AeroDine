import React, { useEffect, useState, useCallback } from 'react';
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
  const [initialLoad, setInitialLoad] = useState(true);
  const socket = useSocket();

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      let tableOrders: Order[] = [];
      
      // Always prioritize tableId from cart store
      if (tableId) {
        // Load all orders for the current table
        const allOrdersResponse = await apiClient.get('/orders');
        // Backend returns { orders: [...], total, page, ... }
        const allOrders = Array.isArray(allOrdersResponse.data) 
          ? allOrdersResponse.data 
          : allOrdersResponse.data?.orders || [];
        // Ensure both values are numbers for comparison
        tableOrders = allOrders.filter(
          (o: Order) => {
            const orderTableId = o.table?.id ? Number(o.table.id) : null;
            const currentTableId = Number(tableId);
            return orderTableId === currentTableId && !['CANCELLED'].includes(o.status);
          }
        );
      } else if (orderId) {
        // If no tableId, try to get from orderId
        const response = await apiClient.get(`/orders/${orderId}`);
        const order = response.data;
        
        // Load all orders for the same table
        const allOrdersResponse = await apiClient.get('/orders');
        const allOrders = Array.isArray(allOrdersResponse.data) 
          ? allOrdersResponse.data 
          : allOrdersResponse.data?.orders || [];
        tableOrders = allOrders.filter(
          (o: Order) => {
            const orderTableId = o.table?.id ? Number(o.table.id) : null;
            const targetTableId = order.table?.id ? Number(order.table.id) : null;
            return orderTableId === targetTableId && !['CANCELLED'].includes(o.status);
          }
        );
      } else {
        // Try to get last order from localStorage
        const lastOrderId = localStorage.getItem('lastOrderId');
        if (lastOrderId) {
          const response = await apiClient.get(`/orders/${lastOrderId}`);
          const order = response.data;
          const allOrdersResponse = await apiClient.get('/orders');
          const allOrders = Array.isArray(allOrdersResponse.data) 
            ? allOrdersResponse.data 
            : allOrdersResponse.data?.orders || [];
          tableOrders = allOrders.filter(
            (o: Order) => {
              const orderTableId = o.table?.id ? Number(o.table.id) : null;
              const targetTableId = order.table?.id ? Number(order.table.id) : null;
              return orderTableId === targetTableId && !['CANCELLED'].includes(o.status);
            }
          );
        }
      }

      // Sort orders and update state together to avoid glitch
      const sortedOrders = tableOrders.sort((a: Order, b: Order) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      // Use requestAnimationFrame to ensure smooth transition
      requestAnimationFrame(() => {
        setOrders(sortedOrders);
        setLoading(false);
        setInitialLoad(false);
      });
    } catch (error) {
      console.error('Failed to load orders:', error);
      setLoading(false);
      setInitialLoad(false);
    }
  }, [tableId, orderId]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    // Subscribe to order updates via WebSocket (only after initial load)
    if (socket && !initialLoad) {
      const handleOrderUpdate = (updatedOrder: Order) => {
        // Only update if the order belongs to current table
        if (tableId) {
          const orderTableId = updatedOrder.table?.id ? Number(updatedOrder.table.id) : null;
          const currentTableId = Number(tableId);
          if (orderTableId === currentTableId) {
            setOrders((prev) => {
              const index = prev.findIndex((o) => o.id === updatedOrder.id);
              if (index >= 0) {
                const newOrders = [...prev];
                newOrders[index] = updatedOrder;
                return newOrders;
              } else if (!['CANCELLED'].includes(updatedOrder.status)) {
                // Add new order if it belongs to current table
                return [...prev, updatedOrder].sort((a, b) => 
                  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );
              }
              return prev;
            });
          }
        }
      };

      // Subscribe to all order updates for this table
      socket.socket?.on('order:update', handleOrderUpdate);

      return () => {
        socket.socket?.off('order:update', handleOrderUpdate);
      };
    }
  }, [socket, tableId, initialLoad]);

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

  if (loading && initialLoad) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] pb-20">
        <div className="p-5 py-8">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-amber-700"></div>
            <p className="mt-4 text-gray-300">Loading orders...</p>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  if (!loading && orders.length === 0) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] pb-20">
        <div className="p-5 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-white mb-4">No orders found</h2>
            <button
              onClick={() => navigate('/customer/menu')}
              className="px-6 py-3 bg-amber-700 text-white rounded-xl hover:bg-amber-600 transition-all duration-200 font-medium"
            >
              Back to Menu
            </button>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  const currentTable = orders[0]?.table || (tableId ? { id: tableId, name: tableId.toString() } : null);

  return (
    <div className="min-h-screen bg-[#0f0f0f] pb-20">
      {/* Header */}
      <div className="bg-[#1a1a1a] border-b border-gray-800/50">
        <div className="p-5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white">Smart Restaurant</span>
            {currentTable && (
              <span className="px-3 py-1 bg-amber-700 text-white rounded-full text-sm font-medium">
                {currentTable.name}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="p-5">
        <h2 className="text-xl font-bold text-white mb-4">Your Orders</h2>

        <div className="space-y-4 mb-6">
          {orders.map((order) => {
            const currentStatusIndex = getCurrentStatusIndex(order.status);
            const orderTime = new Date(order.createdAt).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div key={order.id} className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-800/50">
                <div className="mb-3">
                  <h3 className="font-semibold text-white">
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
                        <div className="flex items-center gap-2 min-w-[140px]">
                          {isCompleted ? (
                            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-gray-600"></div>
                          )}
                          <span className={`text-sm ${isCompleted ? 'text-white' : 'text-gray-300'}`}>
                            {statusLabel}
                          </span>
                          {isCurrent && (
                            <span className="text-xs text-amber-600 font-medium">← Current</span>
                          )}
                        </div>
                        {isCurrent && status === 'IN_PROGRESS' && (
                          <div className="flex items-center gap-1 text-sm text-amber-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            <span>{getEstimatedTime(status)}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Order Items */}
                <div className="mt-4 pt-4 border-t border-gray-800/50">
                  <p className="text-sm font-medium text-white mb-2">Items:</p>
                  <div className="space-y-1">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 text-sm text-gray-300">
                        <span>• {item.name} x{item.quantity}</span>
                        {item.status === 'READY' || item.status === 'COMPLETED' ? (
                          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
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
        <div className="mb-6 border-t border-gray-800/50 pt-4">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-white">Total so far:</span>
            <span className="text-lg font-bold text-amber-600">{formatVND(getTotalAmount())}</span>
          </div>
        </div>

        {/* Request Bill Button */}
        <button
          onClick={() => {
            // Navigate to payment/bill page
            navigate('/customer/menu');
          }}
          className="w-full px-6 py-3 bg-amber-700 text-white rounded-xl hover:bg-amber-600 transition-all duration-200 font-medium"
        >
          Request Bill
        </button>
      </div>

      <BottomNavigation />
    </div>
  );
};
