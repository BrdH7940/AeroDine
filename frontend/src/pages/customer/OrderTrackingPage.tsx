import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { orderService } from '../../services/order.service';
import { paymentService } from '../../services/payment.service';
import { useSocket } from '../../hooks/useSocket';
import { formatVND } from '../../utils/currency';
import { BottomNavigation } from '../../components/customer';
import { useCartStore } from '../../store/cartStore';
import type { Order } from '@aerodine/shared-types';
import { OrderItemStatus, PaymentMethod } from '@aerodine/shared-types';

const statusLabels: Record<string, string> = {
  PENDING_REVIEW: 'Waiting for Confirmation',
  PENDING: 'Confirmed',
  IN_PROGRESS: 'Preparing',
  COMPLETED: 'Ready',
  CANCELLED: 'Cancelled',
};

const orderStatusFlow = ['PENDING_REVIEW', 'PENDING', 'IN_PROGRESS', 'COMPLETED'];

export const OrderTrackingPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { tableId } = useCartStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const socket = useSocket();

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      let tableOrders: Order[] = [];
      
      // Always prioritize tableId from cart store
      if (tableId) {
        // Load all orders for the current table using PUBLIC endpoint
        tableOrders = await orderService.getOrdersByTable(tableId, true);
      } else if (orderId) {
        // If no tableId, try to get from orderId using PUBLIC endpoint
        const order = await orderService.getPublicOrder(parseInt(orderId));
        
        // Load all orders for the same table
        if (order.table?.id) {
          tableOrders = await orderService.getOrdersByTable(order.table.id, true);
        } else {
          tableOrders = [order];
        }
      } else {
        // Try to get last order from localStorage
        const lastOrderId = localStorage.getItem('lastOrderId');
        if (lastOrderId) {
          const order = await orderService.getPublicOrder(parseInt(lastOrderId));
          
          // Load all orders for the same table
          if (order.table?.id) {
            tableOrders = await orderService.getOrdersByTable(order.table.id, true);
          } else {
            tableOrders = [order];
          }
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

  const hasUnpaidOrders = () => {
    return orders.some(order => 
      !order.payment || order.payment.status !== 'SUCCESS'
    );
  };

  const handlePayWithCard = async () => {
    if (orders.length === 0) return;
    
    setPaymentLoading(true);
    try {
      // For multiple orders, we'll pay for the first unpaid order
      // In production, you might want to combine all orders into one payment
      const unpaidOrder = orders.find(order => 
        !order.payment || order.payment.status !== 'SUCCESS'
      );

      if (!unpaidOrder) {
        alert('All orders have been paid');
        return;
      }

      // Create Stripe checkout session
      const { url } = await paymentService.createStripeCheckout(unpaidOrder.id);
      
      // Redirect to Stripe checkout
      window.location.href = url;
    } catch (error) {
      console.error('Failed to create payment:', error);
      alert('Failed to create payment. Please try again.');
      setPaymentLoading(false);
    }
  };

  const handleRequestCashPayment = async () => {
    if (orders.length === 0) return;
    
    setPaymentLoading(true);
    try {
      const unpaidOrder = orders.find(order => 
        !order.payment || order.payment.status !== 'SUCCESS'
      );

      if (!unpaidOrder) {
        alert('All orders have been paid');
        return;
      }

      // Request cash payment (notify staff)
      await paymentService.requestCashPayment(unpaidOrder.id);
      
      alert('Cash payment request sent! Please wait for staff to confirm your payment.');
      setShowPaymentModal(false);
    } catch (error) {
      console.error('Failed to request cash payment:', error);
      alert('Failed to request cash payment. Please try again.');
    } finally {
      setPaymentLoading(false);
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
        <h2 className="text-xl font-bold text-[#36454F] mb-4">Your Orders</h2>

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
                  <div className="space-y-1">
                    {order.items?.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 text-sm text-[#36454F]/70">
                        <span>• {item.name} x{item.quantity}</span>
                        {item.status === OrderItemStatus.READY || item.status === OrderItemStatus.SERVED ? (
                          <svg className="w-4 h-4 text-[#8A9A5B]" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-[#8A9A5B]/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <div className="mb-6 border-t border-[#8A9A5B]/20 pt-4">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-[#36454F]">Total so far:</span>
            <span className="text-lg font-bold text-[#8A9A5B]">{formatVND(getTotalAmount())}</span>
          </div>
        </div>

        {/* Payment Button - Only show if there are unpaid orders */}
        {hasUnpaidOrders() && (
          <button
            onClick={() => setShowPaymentModal(true)}
            className="w-full px-6 py-3 bg-[#D4AF37] text-white rounded-xl hover:bg-[#B8941F] transition-all duration-200 font-medium shadow-md"
          >
            Pay Now
          </button>
        )}

        {/* All Paid Message */}
        {!hasUnpaidOrders() && orders.length > 0 && (
          <div className="text-center py-4 bg-green-50 rounded-xl border border-green-200">
            <div className="flex items-center justify-center gap-2 text-green-700">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">All orders have been paid</span>
            </div>
          </div>
        )}
      </div>

      <BottomNavigation />

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-[#36454F] mb-4">Choose Payment Method</h3>
            
            <div className="space-y-3 mb-6">
              {/* Card Payment Option */}
              <button
                onClick={handlePayWithCard}
                disabled={paymentLoading}
                className="w-full p-4 bg-[#8A9A5B] text-white rounded-xl hover:bg-[#7A8A4B] transition-all duration-200 flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  <div className="text-left">
                    <div className="font-semibold">Pay with Card</div>
                    <div className="text-sm opacity-90">Visa, Mastercard, etc.</div>
                  </div>
                </div>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Cash Payment Option */}
              <button
                onClick={handleRequestCashPayment}
                disabled={paymentLoading}
                className="w-full p-4 bg-[#D4AF37] text-white rounded-xl hover:bg-[#B8941F] transition-all duration-200 flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <div className="text-left">
                    <div className="font-semibold">Request Cash Payment</div>
                    <div className="text-sm opacity-90">Staff will confirm</div>
                  </div>
                </div>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Loading State */}
            {paymentLoading && (
              <div className="text-center py-2 mb-4">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[#8A9A5B]"></div>
                <p className="mt-2 text-sm text-[#36454F]">Processing...</p>
              </div>
            )}

            {/* Cancel Button */}
            <button
              onClick={() => setShowPaymentModal(false)}
              disabled={paymentLoading}
              className="w-full px-6 py-3 bg-gray-100 text-[#36454F] rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
