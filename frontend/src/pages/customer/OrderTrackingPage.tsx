import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { orderService } from '../../services/order.service';
import { useSocket } from '../../hooks/useSocket';
import { formatVND } from '../../utils/currency';
import { BottomNavigation } from '../../components/customer';
import { useCartStore } from '../../store/cartStore';
import { useUserStore } from '../../store/userStore';
import { useModal } from '../../contexts/ModalContext';
import type { Order } from '@aerodine/shared-types';
import { OrderItemStatus } from '@aerodine/shared-types';

const statusLabels: Record<string, string> = {
  PENDING_REVIEW: 'Waiting for Confirmation',
  PENDING: 'Confirmed',
  IN_PROGRESS: 'Preparing',
  COMPLETED: 'Ready',
  CANCELLED: 'Cancelled',
};

const itemStatusLabels: Record<string, string> = {
  QUEUED: 'Queued',
  PREPARING: 'Cooking',
  READY: 'Ready',
  SERVED: 'Served',
  CANCELLED: 'Cancelled',
};

const itemStatusColors: Record<string, string> = {
  QUEUED: 'text-[#36454F]/50',
  PREPARING: 'text-[#D4AF37]',
  READY: 'text-[#8A9A5B]',
  SERVED: 'text-[#8A9A5B]',
  CANCELLED: 'text-red-500',
};

const orderStatusFlow = ['PENDING_REVIEW', 'PENDING', 'IN_PROGRESS', 'COMPLETED'];

export const OrderTrackingPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { tableId } = useCartStore();
  const { isAuthenticated, user } = useUserStore();
  const { alert } = useModal();
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderHistory, setOrderHistory] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [isOrderHistory, setIsOrderHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const socket = useSocket();

  // Helper function to check if order is fully served (all items are SERVED)
  const isOrderFullyServed = (order: Order): boolean => {
    if (!order.items || order.items.length === 0) return false;
    return order.items.every(item => item.status === OrderItemStatus.SERVED);
  };

  // Helper function to check if order can request bill
  const canRequestBill = (order: Order): boolean => {
    // Can request bill if order is not cancelled and has at least one item served
    if (order.status === 'CANCELLED') return false;
    if (!order.items || order.items.length === 0) return false;
    return order.items.some(item => item.status === OrderItemStatus.SERVED || item.status === OrderItemStatus.READY);
  };

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      let loadedOrders: Order[] = [];
      
      // Check if this is order history page (no orderId, no tableId, and user is logged in)
      const isHistoryPage = !orderId && !tableId && isAuthenticated && location.pathname === '/customer/orders';
      
      if (isHistoryPage) {
        // Load order history for logged-in user
        setIsOrderHistory(true);
        const response = await orderService.getOrders({ page: 1, pageSize: 50 });
        loadedOrders = response.orders || [];
      } else if (tableId) {
        // Load all orders for the current table using PUBLIC endpoint
        setIsOrderHistory(false);
        loadedOrders = await orderService.getOrdersByTable(tableId, true);
      } else if (orderId) {
        // If no tableId, try to get from orderId using PUBLIC endpoint
        setIsOrderHistory(false);
        const order = await orderService.getPublicOrder(parseInt(orderId));
        
        // Load all orders for the same table
        if (order.table?.id) {
          loadedOrders = await orderService.getOrdersByTable(order.table.id, true);
        } else {
          loadedOrders = [order];
        }
      } else {
        // Try to get last order from localStorage
        setIsOrderHistory(false);
        const lastOrderId = localStorage.getItem('lastOrderId');
        if (lastOrderId) {
          const order = await orderService.getPublicOrder(parseInt(lastOrderId));
          
          // Load all orders for the same table
          if (order.table?.id) {
            loadedOrders = await orderService.getOrdersByTable(order.table.id, true);
          } else {
            loadedOrders = [order];
          }
        }
      }

      // Sort orders and update state together to avoid glitch
      const sortedOrders = loadedOrders.sort((a: Order, b: Order) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      // Filter to only show orders that are not fully served (for active orders view)
      const filteredOrders = isHistoryPage 
        ? sortedOrders 
        : sortedOrders.filter(order => !isOrderFullyServed(order));
      
      // Use requestAnimationFrame to ensure smooth transition
      requestAnimationFrame(() => {
        setOrders(filteredOrders);
        setLoading(false);
        setInitialLoad(false);
      });
    } catch (error) {
      console.error('Failed to load orders:', error);
      setLoading(false);
      setInitialLoad(false);
    }
  }, [tableId, orderId, isAuthenticated, location.pathname]);

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

  const handleRequestBill = async (orderId: number) => {
    try {
      await orderService.requestBill(orderId);
      await alert({
        title: 'Thành công',
        message: 'Bill request has been sent to the waiter',
        type: 'success',
      });
    } catch (error: any) {
      console.error('Failed to request bill:', error);
      await alert({
        title: 'Lỗi',
        message: error.response?.data?.message || 'Failed to request bill. Please try again.',
        type: 'error',
      });
    }
  };

  const handleToggleHistory = async () => {
    if (!showHistory && isAuthenticated && user) {
      // Load order history
      setLoadingHistory(true);
      try {
        const response = await orderService.getOrders({ page: 1, pageSize: 50 });
        setOrderHistory(response.orders || []);
        setShowHistory(true);
      } catch (error) {
        console.error('Failed to load order history:', error);
        await alert({
          title: 'Lỗi',
          message: 'Failed to load order history. Please try again.',
          type: 'error',
        });
      } finally {
        setLoadingHistory(false);
      }
    } else {
      setShowHistory(false);
    }
  };

  if (loading && initialLoad) {
    return (
      <div className="min-h-screen bg-[#F9F7F2] pb-20">
        <div className="p-5 py-8">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#8A9A5B]"></div>
            <p className="mt-4 text-[#36454F]">Loading orders...</p>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  if (!loading && orders.length === 0) {
    return (
      <div className="min-h-screen bg-[#F9F7F2] pb-20">
        <div className="p-5 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-[#36454F] mb-4">No orders found</h2>
            <button
              onClick={() => navigate('/customer/menu')}
              className="px-6 py-3 bg-[#D4AF37] text-white rounded-xl hover:bg-[#B8941F] transition-all duration-200 font-medium"
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
    <div className="min-h-screen bg-[#F9F7F2] pb-20">
      {/* Header */}
      <div className="bg-[#8A9A5B] border-b border-[#8A9A5B]/20 shadow-sm">
        <div className="p-5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white">Smart Restaurant</span>
            {currentTable && (
              <span className="px-3 py-1 bg-[#D4AF37] text-white rounded-full text-sm font-medium">
                {currentTable.name}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[#36454F]">
            {isOrderHistory ? 'Order History' : 'Your Orders'}
          </h2>
          {isAuthenticated && !isOrderHistory && (
            <button
              onClick={handleToggleHistory}
              disabled={loadingHistory}
              className="px-4 py-2 bg-white border border-[#8A9A5B]/30 text-[#36454F] rounded-xl hover:bg-[#F9F7F2] transition-all duration-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingHistory ? 'Loading...' : showHistory ? 'Hide History' : 'Show History'}
            </button>
          )}
        </div>

        {/* Order History Section */}
        {showHistory && isAuthenticated && orderHistory.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-[#36454F] mb-3">Order History</h3>
            <div className="space-y-4">
              {orderHistory.map((order) => {
                const orderTime = new Date(order.createdAt).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                const orderDate = new Date(order.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                });

                return (
                  <div key={order.id} className="bg-white rounded-xl p-4 border border-[#8A9A5B]/20 shadow-sm opacity-75">
                    <div className="mb-3">
                      <h3 className="font-semibold text-[#36454F]">
                        Order #{order.id} - {orderDate} {orderTime}
                      </h3>
                      <p className="text-sm text-[#36454F]/70 mt-1">
                        Table: {order.table?.name || 'N/A'} • Total: {formatVND(Number(order.totalAmount))}
                      </p>
                    </div>

                    {/* Status */}
                    <div className="mb-2">
                      <span className={`text-sm font-medium ${
                        order.status === 'COMPLETED' ? 'text-[#8A9A5B]' :
                        order.status === 'CANCELLED' ? 'text-red-500' :
                        'text-[#36454F]/70'
                      }`}>
                        {statusLabels[order.status] || order.status}
                      </span>
                    </div>

                    {/* Order Items Summary */}
                    <div className="mt-2 pt-2 border-t border-[#8A9A5B]/20">
                      <p className="text-sm text-[#36454F]/70">
                        {order.items?.length || 0} item(s)
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Active Orders Section */}
        <div className="space-y-4 mb-6">
          {orders.map((order) => {
            const currentStatusIndex = getCurrentStatusIndex(order.status);
            const orderTime = new Date(order.createdAt).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div key={order.id} className="bg-white rounded-xl p-4 border border-[#8A9A5B]/20 shadow-sm">
                <div className="mb-3">
                  <h3 className="font-semibold text-[#36454F]">
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
                            <svg className="w-5 h-5 text-[#8A9A5B]" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-[#8A9A5B]/30"></div>
                          )}
                          <span className={`text-sm ${isCompleted ? 'text-[#36454F]' : 'text-[#36454F]/70'}`}>
                            {statusLabel}
                          </span>
                          {isCurrent && (
                            <span className="text-xs text-[#8A9A5B] font-medium">← Current</span>
                          )}
                        </div>
                        {isCurrent && status === 'IN_PROGRESS' && (
                          <div className="flex items-center gap-1 text-sm text-[#8A9A5B]">
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
                <div className="mt-4 pt-4 border-t border-[#8A9A5B]/20">
                  <p className="text-sm font-medium text-[#36454F] mb-2">Items:</p>
                  <div className="space-y-2">
                    {order.items?.map((item) => {
                      const statusLabel = itemStatusLabels[item.status] || item.status;
                      const statusColor = itemStatusColors[item.status] || 'text-[#36454F]/70';
                      const isCompleted = item.status === OrderItemStatus.READY || item.status === OrderItemStatus.SERVED;
                      const isPreparing = item.status === OrderItemStatus.PREPARING;
                      
                      return (
                        <div key={item.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-[#36454F]/70">• {item.name} x{item.quantity}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-medium ${statusColor}`}>
                              {statusLabel}
                            </span>
                            {isCompleted ? (
                              <svg className="w-4 h-4 text-[#8A9A5B]" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            ) : isPreparing ? (
                              <svg className="w-4 h-4 text-[#D4AF37] animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            ) : (
                              <div className="w-4 h-4 rounded-full border-2 border-[#8A9A5B]/30"></div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Request Bill Button for each order */}
                {!isOrderHistory && canRequestBill(order) && (
                  <div className="mt-4 pt-4 border-t border-[#8A9A5B]/20">
                    <button
                      onClick={() => handleRequestBill(order.id)}
                      className="w-full px-4 py-2 bg-[#8A9A5B] text-white rounded-xl hover:bg-[#6B7A4A] transition-all duration-200 text-sm font-medium"
                    >
                      Request Bill for Order #{order.id}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {!isOrderHistory && orders.length === 0 && (
          <div className="text-center py-8">
            <p className="text-[#36454F]/70">No active orders. All items have been served.</p>
          </div>
        )}

        {/* Total - Only show for active orders (not history) */}
        {!isOrderHistory && orders.length > 0 && (
          <div className="mb-6 border-t border-[#8A9A5B]/20 pt-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-[#36454F]">Total so far:</span>
              <span className="text-lg font-bold text-[#8A9A5B]">{formatVND(getTotalAmount())}</span>
            </div>
          </div>
        )}

        {/* Back to Menu Button */}
        {!isOrderHistory && (
          <button
            onClick={() => {
              navigate('/customer/menu');
            }}
            className="w-full px-6 py-3 bg-[#D4AF37] text-white rounded-xl hover:bg-[#B8941F] transition-all duration-200 font-medium"
          >
            Back to Menu
          </button>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
};
