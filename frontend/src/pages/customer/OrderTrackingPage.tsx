import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderService } from '../../services/order.service';
import { 
  useSocket, 
  useTableRoom, 
  useRestaurantRoom,
  useOrderUpdated,
  useOrderStatusChanged,
  useOrderItemStatusChanged,
  useOrderCreated
} from '../../hooks/useSocket';
import { formatVND } from '../../utils/currency';
import { BottomNavigation } from '../../components/customer';
import { useUserStore } from '../../store/userStore';
import { useModal } from '../../contexts/ModalContext';
import { authService } from '../../services/auth.service';
import { getGuestSessionId } from '../../utils/guestSession';
import { SocketEvents } from '@aerodine/shared-types';
import type { 
  Order, 
  OrderWithDetails,
  OrderUpdatedEvent,
  OrderStatusChangedEvent,
  OrderItemStatusChangedEvent,
  OrderCreatedEvent
} from '@aerodine/shared-types';
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

// Order History List Component
const OrderHistoryList: React.FC<{ orders: Order[] }> = ({ orders }) => {
  if (orders.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-[#36454F]/70">No order history found.</p>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-[#36454F] mb-3">Order History</h3>
      <div className="space-y-4">
        {orders.map((order) => {
          const orderTime = new Date(order.createdAt).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          });
          const orderDate = new Date(order.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });

          const isMergedOrder = order.status === 'CANCELLED' && order.note?.includes('Merged into order');
          
          return (
            <div key={order.id} className="bg-white rounded-xl p-4 border border-[#8A9A5B]/20 shadow-sm opacity-75">
              <div className="mb-3">
                <h3 className="font-semibold text-[#36454F]">
                  Order #{order.id} - {orderDate} {orderTime}
                  {isMergedOrder && (
                    <span className="ml-2 text-xs text-[#8A9A5B] font-normal">
                      (Merged)
                    </span>
                  )}
                </h3>
                <p className="text-sm text-[#36454F]/70 mt-1">
                  Table: {order.table?.name || 'N/A'} • Total: {formatVND(Number(order.totalAmount))}
                </p>
                {isMergedOrder && order.note && (
                  <p className="text-xs text-[#8A9A5B] mt-1 italic">
                    {order.note}
                  </p>
                )}
              </div>

              {/* Status */}
              <div className="mb-2">
                <span className={`text-sm font-medium ${
                  order.status === 'COMPLETED' ? 'text-[#8A9A5B]' :
                  isMergedOrder ? 'text-[#8A9A5B]' :
                  order.status === 'CANCELLED' ? 'text-red-500' :
                  'text-[#36454F]/70'
                }`}>
                  {isMergedOrder ? 'Merged into another order' : (statusLabels[order.status] || order.status)}
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
  );
};

export const OrderTrackingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, setUser } = useUserStore();
  const { alert } = useModal();
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderHistory, setOrderHistory] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const { socket, isConnected } = useSocket();

  // Get unique table IDs and restaurant IDs from orders for room joining
  const { tableIds, restaurantIds } = useMemo(() => {
    const uniqueTableIds = new Set<number>();
    const uniqueRestaurantIds = new Set<number>();
    
    orders.forEach(order => {
      if (order.tableId) uniqueTableIds.add(order.tableId);
      if (order.restaurantId) uniqueRestaurantIds.add(order.restaurantId);
    });
    
    return {
      tableIds: Array.from(uniqueTableIds),
      restaurantIds: Array.from(uniqueRestaurantIds)
    };
  }, [orders]);

  // Get first restaurant ID for restaurant room (if multiple, use first one)
  const primaryRestaurantId = restaurantIds[0];

  // Refresh user data on mount to ensure avatar is loaded
  useEffect(() => {
    if (isAuthenticated) {
      const refreshUserData = async () => {
        try {
          const profile = await authService.getProfile();
          if (profile) {
            setUser(profile);
          }
        } catch (error) {
          // Silently fail - user data from store is still valid
          console.warn('Failed to refresh user profile:', error);
        }
      };
      refreshUserData();
    }
  }, [isAuthenticated, setUser]);

  // Helper function to check if order is paid (payment status is SUCCESS)
  const isOrderPaid = (order: Order): boolean => {
    return order.payment?.status === 'SUCCESS';
  };


  // Helper function to check if order can request bill
  const canRequestBill = (order: Order): boolean => {
    // Can request bill if order is not cancelled and has at least one item ready or served
    if (order.status === 'CANCELLED') return false;
    if (!order.items || order.items.length === 0) return false;
    // Can request bill if order status is COMPLETED or has items that are READY or SERVED
    if (order.status === 'COMPLETED') return true;
    return order.items.some(item => item.status === OrderItemStatus.SERVED || item.status === OrderItemStatus.READY);
  };

  // Helper function to get guest order IDs from localStorage (backward compatibility)
  const getGuestOrderIds = (): number[] => {
    try {
      const stored = localStorage.getItem('guestOrderIds');
      if (stored) {
        return JSON.parse(stored);
      }
      // Fallback to lastOrderId for backward compatibility
      const lastOrderId = localStorage.getItem('lastOrderId');
      if (lastOrderId) {
        return [parseInt(lastOrderId)];
      }
      return [];
    } catch {
      return [];
    }
  };



  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      let loadedOrders: Order[] = [];
      
      if (isAuthenticated && user) {
        // For authenticated users: load all orders of this user (based on userId, not tableId)
        const response = await orderService.getOrders({ page: 1, pageSize: 50 });
        loadedOrders = response.orders || [];
      } else {
        // For guest users: try to load orders by guestSessionId first (server-side tracking)
        const guestSessionId = getGuestSessionId();
        if (guestSessionId) {
          try {
            // Try to load orders from server using guestSessionId
            const response = await orderService.getOrdersByGuestSession();
            loadedOrders = response || [];
          } catch (error) {
            console.warn('Failed to load orders by guest session, falling back to localStorage:', error);
            // Fallback to localStorage for backward compatibility
            const guestOrderIds = getGuestOrderIds();
            if (guestOrderIds.length > 0) {
              const orderPromises = guestOrderIds.map(id => 
                orderService.getPublicOrder(id).catch(() => null)
              );
              const orders = await Promise.all(orderPromises);
              loadedOrders = orders
                .filter((order): order is OrderWithDetails => order !== null)
                .map(order => ({
                  ...order,
                  table: order.table,
                })) as Order[];
            }
          }
        } else {
          // No guest session ID, fallback to localStorage
          const guestOrderIds = getGuestOrderIds();
          if (guestOrderIds.length > 0) {
            const orderPromises = guestOrderIds.map(id => 
              orderService.getPublicOrder(id).catch(() => null)
            );
            const orders = await Promise.all(orderPromises);
            loadedOrders = orders
              .filter((order): order is OrderWithDetails => order !== null)
              .map(order => ({
                ...order,
                table: order.table,
              })) as Order[];
          }
        }
      }

      // Sort orders by creation date (newest first)
      const sortedOrders = loadedOrders.sort((a: Order, b: Order) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      // Filter to show only active orders (not paid) by default
      // Active orders = orders that haven't been paid yet (payment status is not SUCCESS)
      const filteredOrders = sortedOrders.filter(order => {
        // Exclude cancelled orders, but show merged orders in history if needed
        if (order.status === 'CANCELLED') {
          // Don't show merged orders in active list, they'll be in history if paid
          return false;
        }
        // Only show orders that are not paid (payment status is not SUCCESS)
        return !isOrderPaid(order);
      });
      
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
  }, [isAuthenticated, user]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Join restaurant room for menu updates (if we have a restaurant ID)
  useRestaurantRoom(primaryRestaurantId || 0, isAuthenticated ? user?.id : undefined);

  // Join table room for the first table (most common case: single table per customer)
  // Get table token from localStorage or use empty string (backend should handle gracefully)
  const primaryTableId = tableIds[0] || 0;
  const primaryTableToken = primaryTableId 
    ? (localStorage.getItem(`table_token_${primaryTableId}`) || '') 
    : '';
  
  // Join table room (hook will handle the conditional logic internally)
  useTableRoom(
    primaryRestaurantId || 0, 
    primaryTableId, 
    primaryTableToken || ''
  );

  // Join additional table rooms via useEffect (for customers with multiple tables)
  useEffect(() => {
    if (!socket || !isConnected || !primaryRestaurantId) return;

    // Join all table rooms (skip first one as it's handled by useTableRoom hook above)
    const additionalTableIds = tableIds.slice(1);
    
    additionalTableIds.forEach(tableId => {
      const tableToken = localStorage.getItem(`table_token_${tableId}`) || '';
      if (tableToken) {
        socket.emit(SocketEvents.JOIN_TABLE, {
          restaurantId: primaryRestaurantId,
          tableId,
          tableToken
        });
      }
    });

    return () => {
      // Leave all additional table rooms on cleanup
      additionalTableIds.forEach(tableId => {
        socket.emit(SocketEvents.LEAVE_TABLE, { tableId });
      });
    };
  }, [socket, isConnected, primaryRestaurantId, tableIds]);

  // Helper to check if an order belongs to current user/guest
  const isOrderForCurrentUser = useCallback((order: Order | { orderId: number; userId?: number | null; guestSessionId?: string | null }): boolean => {
    if (isAuthenticated && user) {
      return order.userId === user.id;
    } else {
      const guestSessionId = getGuestSessionId();
      if ('guestSessionId' in order) {
        return guestSessionId ? order.guestSessionId === guestSessionId : false;
      }
      // For events that only have orderId, we'll check against current orders
      return false;
    }
  }, [isAuthenticated, user]);

  // Handle order created event
  const handleOrderCreated = useCallback((event: OrderCreatedEvent) => {
    if (!initialLoad && isOrderForCurrentUser(event.order as any)) {
      // Reload orders to get the new order with full details
      loadOrders();
    }
  }, [initialLoad, isOrderForCurrentUser, loadOrders]);

  // Handle order updated event
  const handleOrderUpdated = useCallback((event: OrderUpdatedEvent) => {
    if (!initialLoad) {
      const orderId = event.order.id;
      setOrders((prev) => {
        const index = prev.findIndex((o) => o.id === orderId);
        if (index >= 0) {
          // Update existing order - merge OrderSummary with existing Order
          const existingOrder = prev[index];
          const orderSummary = event.order;
          const updatedOrder: Order = {
            ...existingOrder,
            // Update fields from OrderSummary
            status: orderSummary.status as any,
            totalAmount: orderSummary.totalAmount,
            guestCount: orderSummary.guestCount,
            note: orderSummary.note,
            // Update waiter if provided (waiterName is in OrderSummary but not in Order)
            // Keep existing waiter if no waiterName in summary, or merge waiterName into existing waiter
            waiter: existingOrder.waiter 
              ? (orderSummary.waiterName 
                  ? { ...existingOrder.waiter, fullName: orderSummary.waiterName }
                  : existingOrder.waiter)
              : undefined,
            // Keep existing items structure, but update if provided
            items: orderSummary.items 
              ? orderSummary.items.map(item => ({
                  ...item,
                  orderId: existingOrder.id,
                  updatedAt: existingOrder.updatedAt,
                } as any))
              : existingOrder.items,
          };
          const newOrders = [...prev];
          newOrders[index] = updatedOrder;
          
          // Filter out orders that are now paid or cancelled
          return newOrders
            .filter(order => {
              if (order.status === 'CANCELLED') return false;
              return !isOrderPaid(order);
            })
            .sort((a, b) => 
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
        }
        return prev;
      });
    }
  }, [initialLoad, isOrderPaid]);

  // Handle order status changed event
  const handleOrderStatusChanged = useCallback((event: OrderStatusChangedEvent) => {
    if (!initialLoad) {
      setOrders((prev) => {
        const index = prev.findIndex((o) => o.id === event.orderId);
        if (index >= 0) {
          const newOrders = [...prev];
          newOrders[index] = {
            ...newOrders[index],
            status: event.newStatus as any,
            updatedAt: event.updatedAt
          };
          
          // Filter out orders that are now paid or cancelled
          return newOrders
            .filter(order => {
              if (order.status === 'CANCELLED') return false;
              return !isOrderPaid(order);
            })
            .sort((a, b) => 
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
        }
        return prev;
      });
    }
  }, [initialLoad, isOrderPaid]);

  // Handle order item status changed event
  const handleOrderItemStatusChanged = useCallback((event: OrderItemStatusChangedEvent) => {
    if (!initialLoad) {
      setOrders((prev) => {
        const index = prev.findIndex((o) => o.id === event.orderId);
        if (index >= 0) {
          const newOrders = [...prev];
          const order = newOrders[index];
          if (order.items) {
            const itemIndex = order.items.findIndex((item) => item.id === event.orderItemId);
            if (itemIndex >= 0) {
              const updatedItems = [...order.items];
              updatedItems[itemIndex] = {
                ...updatedItems[itemIndex],
                status: event.newStatus as any
              };
              newOrders[index] = {
                ...order,
                items: updatedItems
              };
            }
          }
          return newOrders;
        }
        return prev;
      });
    }
  }, [initialLoad]);

  // Setup socket event listeners using hooks
  useOrderCreated(handleOrderCreated);
  useOrderUpdated(handleOrderUpdated);
  useOrderStatusChanged(handleOrderStatusChanged);
  useOrderItemStatusChanged(handleOrderItemStatusChanged);

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
      // Load order history - only paid orders (payment status is SUCCESS)
      setLoadingHistory(true);
      try {
        const response = await orderService.getOrders({ page: 1, pageSize: 50 });
        // Filter to only show paid orders (payment status is SUCCESS)
        // Also include merged orders (CANCELLED with merge note) for transparency
        const historyOrders = (response.orders || []).filter(order => {
          const isPaid = isOrderPaid(order);
          const isMergedOrder = order.status === 'CANCELLED' && order.note?.includes('Merged into order');
          return isPaid || isMergedOrder;
        });
        setOrderHistory(historyOrders);
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

  if (!loading && orders.length === 0 && !showHistory) {
    return (
      <div className="min-h-screen bg-[#F9F7F2] pb-20">
        {/* Header */}
        <div className="bg-[#8A9A5B] border-b border-[#8A9A5B]/20 shadow-sm">
          <div className="p-5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">Smart Restaurant</span>
            </div>
          </div>
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-[#36454F]">
              Your Orders
            </h2>
            {isAuthenticated && user && (
              <button
                onClick={handleToggleHistory}
                disabled={loadingHistory}
                className="px-4 py-2 bg-white border border-[#8A9A5B]/30 text-[#36454F] rounded-xl hover:bg-[#F9F7F2] transition-all duration-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingHistory ? 'Loading...' : showHistory ? 'Hide History' : 'Show History'}
              </button>
            )}
          </div>

          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-[#36454F] mb-4">No orders found</h2>
            <button
              onClick={() => navigate('/customer/menu')}
              className="px-6 py-3 bg-[#D4AF37] text-white rounded-xl hover:bg-[#B8941F] transition-all duration-200 font-medium"
            >
              Back to Menu
            </button>
          </div>

          {/* Order History Section - Show even when no active orders */}
          {showHistory && isAuthenticated && (
            <OrderHistoryList orders={orderHistory} />
          )}
        </div>

        <BottomNavigation />
      </div>
    );
  }

  const currentTable = orders[0]?.table || null;

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
            Your Orders
          </h2>
          {isAuthenticated && user && (
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
        {showHistory && isAuthenticated && (
          <OrderHistoryList orders={orderHistory} />
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
                {canRequestBill(order) && (
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

        {orders.length === 0 && !showHistory && (
          <div className="text-center py-8">
            <p className="text-[#36454F]/70">No active orders. All orders have been paid.</p>
          </div>
        )}

        {/* Total - Only show for active orders */}
        {orders.length > 0 && (
          <div className="mb-6 border-t border-[#8A9A5B]/20 pt-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-[#36454F]">Total so far:</span>
              <span className="text-lg font-bold text-[#8A9A5B]">{formatVND(getTotalAmount())}</span>
            </div>
          </div>
        )}

        {/* Back to Menu Button */}
        <button
          onClick={() => {
            navigate('/customer/menu');
          }}
          className="w-full px-6 py-3 bg-[#D4AF37] text-white rounded-xl hover:bg-[#B8941F] transition-all duration-200 font-medium"
        >
          Back to Menu
        </button>
      </div>

      <BottomNavigation />
    </div>
  );
};
