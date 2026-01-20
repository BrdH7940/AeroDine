import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../../store/cartStore';
import { BottomNavigation } from '../../components/customer';
import { apiClient } from '../../services/api';
import { formatVND } from '../../utils/currency';
import { useModal } from '../../contexts/ModalContext';

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { alert } = useModal();
  const {
    items,
    tableId,
    restaurantId,
    updateQuantity,
    removeItem,
    getTotal,
    setTableId,
    clearCart,
  } = useCartStore();

  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [guestCount] = useState(1);
  const [note, setNote] = useState('');
  const [tableInputValue, setTableInputValue] = useState('');
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [orderId, setOrderId] = useState<number | null>(null);
  const [orderTotal, setOrderTotal] = useState<number>(0);

  // Calculate total before placing order
  const calculateOrderTotal = (): number => {
    return getTotal();
  };

  const handlePlaceOrder = async () => {
    if (!tableId) {
      await alert({
        title: 'Thiếu thông tin',
        message: 'Please set a table number',
        type: 'warning',
      });
      return;
    }

    if (items.length === 0) {
      await alert({
        title: 'Giỏ hàng trống',
        message: 'Your cart is empty',
        type: 'warning',
      });
      return;
    }

    setIsPlacingOrder(true);
    try {
      // Ensure tableId is a number
      const numericTableId = Number(tableId);
      if (isNaN(numericTableId) || numericTableId <= 0) {
        await alert({
          title: 'Lỗi',
          message: 'Invalid table number',
          type: 'error',
        });
        setIsPlacingOrder(false);
        return;
      }

      // Calculate total before creating order
      const total = calculateOrderTotal();

      const orderData = {
        tableId: numericTableId,
        restaurantId: restaurantId || 4, // Default to 4 if not set
        guestCount,
        note: note || undefined,
        items: items.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          note: item.note,
          modifiers: item.modifiers?.map((mod) => ({
            modifierOptionId: mod.modifierOptionId,
            modifierName: mod.modifierName,
            priceAdjustment: mod.priceAdjustment,
          })),
        })),
      };

      console.log('Creating order with tableId:', numericTableId, 'orderData:', orderData);

      // Create order
      // Note: apiClient automatically includes JWT token if user is logged in
      // Backend will capture userId from token for authenticated users
      // Guest orders (no token) are also supported
      const response = await apiClient.post('/orders', orderData);
      console.log('Order created:', response.data);
      const createdOrderId = response.data.id;

      // Store orderId for later use
      localStorage.setItem('lastOrderId', createdOrderId.toString());
      
      // Also store in guestOrderIds array for guest users
      try {
        const existing = JSON.parse(localStorage.getItem('guestOrderIds') || '[]');
        if (!existing.includes(createdOrderId)) {
          existing.push(createdOrderId);
          localStorage.setItem('guestOrderIds', JSON.stringify(existing));
        }
      } catch (error) {
        console.error('Failed to save guest order ID:', error);
      }

      // Store order info for success dialog BEFORE clearing cart
      setOrderId(createdOrderId);
      setOrderTotal(total);

      // Show success dialog first
      setIsPlacingOrder(false);
      setShowSuccessDialog(true);
      console.log('Setting showSuccessDialog to true, orderId:', createdOrderId, 'total:', total);
      
      // Clear cart after dialog is shown (with delay to ensure dialog renders)
      setTimeout(() => {
        clearCart();
      }, 300);
    } catch (error: any) {
      console.error('Failed to place order:', error);
      await alert({
        title: 'Lỗi',
        message: error.response?.data?.message || 'Failed to place order. Please try again.',
        type: 'error',
      });
      setIsPlacingOrder(false);
    }
  };

  const handleSuccessDialogClose = () => {
    setShowSuccessDialog(false);
    if (orderId) {
      navigate(`/customer/orders/${orderId}`);
    } else {
      navigate('/customer/menu');
    }
  };

  // Don't show empty cart if success dialog is showing
  if (items.length === 0 && !showSuccessDialog) {
    return (
      <div className="min-h-screen bg-[#F9F7F2] pb-20">
        <div className="p-5">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate('/customer/menu')}
              className="text-[#8A9A5B] hover:text-[#6B7A4A] font-medium transition-colors duration-200"
            >
              ← Back
            </button>
            <h1 className="text-xl font-bold text-[#36454F]">Shopping Cart</h1>
            <div></div>
          </div>
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-[#36454F] mb-4">Your cart is empty</h2>
            <button
              onClick={() => navigate('/customer/menu')}
              className="px-6 py-3 bg-[#D4AF37] text-white rounded-xl hover:bg-[#B8941F] transition-all duration-200 font-medium"
            >
              [+ Browse Menu]
            </button>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F7F2] pb-20">
      {/* Header */}
      <div className="bg-[#8A9A5B] border-b border-[#8A9A5B]/20 shadow-sm">
        <div className="p-5">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/customer/menu')}
              className="text-white hover:text-[#F9F7F2] font-medium transition-colors duration-200"
            >
              ← Back
            </button>
            <h1 className="text-xl font-bold text-white">Shopping Cart</h1>
            <div></div>
          </div>
        </div>
      </div>

      <div className="p-5">
        {/* Table and Order Title */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-[#36454F]">
              {tableId ? `Table ${tableId}` : 'Table'} - Your Order
            </h2>
            {tableId && (
              <button
                onClick={() => {
                  setTableId(0);
                  setTableInputValue('');
                }}
                className="text-xs text-[#8A9A5B] hover:text-[#6B7A4A] font-medium transition-colors duration-200"
              >
                Change
              </button>
            )}
          </div>
          {(!tableId || tableId === 0) && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#36454F] mb-2">
                Table Number <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                value={tableInputValue}
                onChange={(e) => {
                  const value = e.target.value;
                  setTableInputValue(value);
                }}
                onBlur={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    setTableId(0);
                    setTableInputValue('');
                  } else {
                    const numValue = Number(value);
                    if (!isNaN(numValue) && numValue > 0) {
                      setTableId(numValue);
                    } else {
                      setTableInputValue('');
                    }
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const value = tableInputValue;
                    if (value === '') {
                      setTableId(0);
                      setTableInputValue('');
                    } else {
                      const numValue = Number(value);
                      if (!isNaN(numValue) && numValue > 0) {
                        setTableId(numValue);
                      } else {
                        setTableInputValue('');
                      }
                    }
                    e.currentTarget.blur();
                  }
                }}
                className="w-full px-4 py-3 bg-white text-[#36454F] border border-[#8A9A5B]/30 rounded-xl focus:ring-2 focus:ring-[#8A9A5B]/30 focus:border-[#8A9A5B] transition-all duration-200 placeholder:text-[#36454F]/50 shadow-sm"
                placeholder="Enter table number"
                min="1"
                required
              />
              <p className="mt-1 text-xs text-[#36454F]/70">Please enter your table number to place an order</p>
            </div>
          )}
        </div>

        {/* Cart Items */}
        <div className="space-y-3 mb-6">
          {items.map((item, index) => (
            <div key={`${item.menuItemId}-${index}`} className="bg-white rounded-xl p-4 border border-[#8A9A5B]/20 shadow-sm">
              <div className="flex gap-4">
                {item.image && (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-16 h-16 object-cover rounded"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/64x64?text=No+Image';
                    }}
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <h3 className="font-semibold text-[#36454F]">
                        {item.name}
                        {item.modifiers && item.modifiers.length > 0 && (
                          <span className="text-sm text-[#36454F]/70 font-normal">
                            {' '}({item.modifiers.map((m) => m.modifierName).join(', ')})
                          </span>
                        )}
                      </h3>
                      {item.modifiers && item.modifiers.some((m) => m.modifierName.toLowerCase().includes('large')) && (
                        <p className="text-sm text-[#36454F]/70">+ {item.modifiers.find((m) => m.modifierName.toLowerCase().includes('large'))?.modifierName}</p>
                      )}
                      {item.modifiers && item.modifiers.some((m) => m.modifierName.toLowerCase().includes('salad')) && (
                        <p className="text-sm text-[#36454F]/70">+ {item.modifiers.find((m) => m.modifierName.toLowerCase().includes('salad'))?.modifierName}</p>
                      )}
                      {item.note && (
                        <p className="text-sm text-[#36454F]/70 italic">"{item.note}"</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (item.quantity > 1) {
                            updateQuantity(item.menuItemId, item.quantity - 1, item.modifiers);
                          } else {
                            removeItem(item.menuItemId, item.modifiers);
                          }
                        }}
                        className="w-8 h-8 flex items-center justify-center border border-[#8A9A5B]/30 rounded-xl hover:bg-[#F9F7F2] text-[#36454F] transition-all duration-200"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-medium text-[#36454F]">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.menuItemId, item.quantity + 1, item.modifiers)}
                        className="w-8 h-8 flex items-center justify-center border border-[#8A9A5B]/30 rounded-xl hover:bg-[#F9F7F2] text-[#36454F] transition-all duration-200"
                      >
                        +
                      </button>
                    </div>
                    <span className="font-bold text-[#8A9A5B]">
                      {formatVND((item.basePrice + (item.modifiers?.reduce((sum, mod) => sum + mod.priceAdjustment, 0) || 0)) * item.quantity)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add More Items */}
        <div className="mb-6">
          <div className="flex items-center justify-between py-2 border-t border-b border-[#8A9A5B]/20">
            <span className="text-[#36454F]">Add more items</span>
            <button
              onClick={() => navigate('/customer/menu')}
              className="px-4 py-2 bg-[#8A9A5B] text-white rounded-xl hover:bg-[#6B7A4A] transition-all duration-200 text-sm font-medium"
            >
              [+ Browse Menu]
            </button>
          </div>
        </div>

        {/* Special Instructions */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-[#36454F] mb-2">
            Special Instructions (Order):
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full px-4 py-3 bg-white text-[#36454F] border border-[#8A9A5B]/30 rounded-xl focus:ring-2 focus:ring-[#8A9A5B]/30 focus:border-[#8A9A5B] transition-all duration-200 placeholder:text-[#36454F]/50 shadow-sm"
            rows={3}
            placeholder="We're celebrating birthday!"
          />
        </div>

        {/* Subtotal */}
        <div className="mb-6 border-t border-[#8A9A5B]/20 pt-4">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-[#36454F]">Subtotal:</span>
            <span className="text-lg font-bold text-[#8A9A5B]">{formatVND(getTotal())}</span>
          </div>
        </div>

        {/* Place Order Button */}
        <button
          onClick={handlePlaceOrder}
          disabled={isPlacingOrder || !tableId || tableId === 0}
          className="w-full px-6 py-3 bg-[#D4AF37] text-white rounded-xl hover:bg-[#B8941F] transition-all duration-200 font-medium disabled:bg-[#8A9A5B]/30 disabled:cursor-not-allowed mb-4"
        >
          {isPlacingOrder ? 'Placing Order...' : 'Place Order'}
        </button>

        {/* Info Message */}
        <div className="flex items-start gap-2 text-sm text-[#36454F]/70">
          <svg className="w-5 h-5 text-[#8A9A5B] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>You can add more orders during your visit</p>
        </div>
      </div>

      {/* Success Dialog */}
      {showSuccessDialog && orderId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-md p-4" onClick={(e) => {
          // Close dialog when clicking outside
          if (e.target === e.currentTarget) {
            handleSuccessDialogClose();
          }
        }}>
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-[#8A9A5B]/20" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              {/* Success Icon */}
              <div className="w-16 h-16 bg-[#8A9A5B]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-[#8A9A5B]"
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

              {/* Success Message */}
              <h2 className="text-2xl font-bold text-[#36454F] mb-2">Order Placed Successfully!</h2>
              <p className="text-[#36454F]/70 mb-4">
                Your order has been received and is being prepared.
              </p>

              {/* Order Details */}
              <div className="bg-[#F9F7F2] rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[#36454F]/70">Order ID:</span>
                  <span className="text-sm font-semibold text-[#36454F]">#{orderId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-[#36454F]">Total Amount:</span>
                  <span className="text-xl font-bold text-[#8A9A5B]">{formatVND(orderTotal)}</span>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handleSuccessDialogClose}
                className="w-full px-6 py-3 bg-[#D4AF37] text-white rounded-xl hover:bg-[#B8941F] transition-all duration-200 font-medium"
              >
                View Order Details
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNavigation />
    </div>
  );
};
