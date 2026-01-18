import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../../store/cartStore';
import { CartItem, BottomNavigation } from '../../components/customer';
import { apiClient } from '../../services/api';
import { formatVND } from '../../utils/currency';

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    items,
    tableId,
    restaurantId,
    updateQuantity,
    removeItem,
    getTotal,
    getItemCount,
    setTableId,
    clearCart,
  } = useCartStore();

  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [guestCount, setGuestCount] = useState(1);
  const [note, setNote] = useState('');
  const [tableInputValue, setTableInputValue] = useState('');

  const handlePlaceOrder = async () => {
    if (!tableId) {
      alert('Please set a table number');
      return;
    }

    if (items.length === 0) {
      alert('Your cart is empty');
      return;
    }

    setIsPlacingOrder(true);
    try {
      // Ensure tableId is a number
      const numericTableId = Number(tableId);
      if (isNaN(numericTableId) || numericTableId <= 0) {
        alert('Invalid table number');
        setIsPlacingOrder(false);
        return;
      }

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
      const response = await apiClient.post('/orders', orderData);
      console.log('Order created:', response.data);
      const orderId = response.data.id;

      // Store orderId for later use
      localStorage.setItem('lastOrderId', orderId.toString());

      // Create Stripe checkout session
      const baseUrl = window.location.origin;
      const checkoutResponse = await apiClient.post(`/orders/${orderId}/checkout`, {
        successUrl: `${baseUrl}/customer/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${baseUrl}/customer/payment/cancel?order_id=${orderId}`,
      });

      // Clear cart before redirecting to Stripe
      clearCart();

      // Redirect to Stripe checkout
      if (checkoutResponse.data.url) {
        window.location.href = checkoutResponse.data.url;
      } else {
        throw new Error('Failed to get checkout URL');
      }
    } catch (error: any) {
      console.error('Failed to place order:', error);
      alert(error.response?.data?.message || 'Failed to place order. Please try again.');
      setIsPlacingOrder(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] pb-20">
        <div className="p-5">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate('/customer/menu')}
              className="text-amber-600 hover:text-amber-500 font-medium transition-colors duration-200"
            >
              ← Back
            </button>
            <h1 className="text-xl font-bold text-white">Shopping Cart</h1>
            <div></div>
          </div>
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-white mb-4">Your cart is empty</h2>
            <button
              onClick={() => navigate('/customer/menu')}
              className="px-6 py-3 bg-amber-700 text-white rounded-xl hover:bg-amber-600 transition-all duration-200 font-medium"
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
    <div className="min-h-screen bg-[#0f0f0f] pb-20">
      {/* Header */}
      <div className="bg-[#1a1a1a] border-b border-gray-800/50">
        <div className="p-5">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/customer/menu')}
              className="text-amber-600 hover:text-amber-500 font-medium transition-colors duration-200"
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
            <h2 className="text-lg font-semibold text-white">
              {tableId ? `Table ${tableId}` : 'Table'} - Your Order
            </h2>
            {tableId && (
              <button
                onClick={() => {
                  setTableId(0);
                  setTableInputValue('');
                }}
                className="text-xs text-amber-600 hover:text-amber-500 font-medium transition-colors duration-200"
              >
                Change
              </button>
            )}
          </div>
          {(!tableId || tableId === 0) && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
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
                className="w-full px-4 py-3 bg-[#252525] text-white border border-gray-700/30 rounded-xl focus:ring-2 focus:ring-amber-700/30 focus:border-amber-700/50 transition-all duration-200 placeholder:text-gray-500"
                placeholder="Enter table number"
                min="1"
                required
              />
              <p className="mt-1 text-xs text-gray-400">Please enter your table number to place an order</p>
            </div>
          )}
        </div>

        {/* Cart Items */}
        <div className="space-y-3 mb-6">
          {items.map((item, index) => (
            <div key={`${item.menuItemId}-${index}`} className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-800/50">
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
                      <h3 className="font-semibold text-white">
                        {item.name}
                        {item.modifiers && item.modifiers.length > 0 && (
                          <span className="text-sm text-gray-300 font-normal">
                            {' '}({item.modifiers.map((m) => m.modifierName).join(', ')})
                          </span>
                        )}
                      </h3>
                      {item.modifiers && item.modifiers.some((m) => m.modifierName.toLowerCase().includes('large')) && (
                        <p className="text-sm text-gray-300">+ {item.modifiers.find((m) => m.modifierName.toLowerCase().includes('large'))?.modifierName}</p>
                      )}
                      {item.modifiers && item.modifiers.some((m) => m.modifierName.toLowerCase().includes('salad')) && (
                        <p className="text-sm text-gray-300">+ {item.modifiers.find((m) => m.modifierName.toLowerCase().includes('salad'))?.modifierName}</p>
                      )}
                      {item.note && (
                        <p className="text-sm text-gray-300 italic">"{item.note}"</p>
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
                        className="w-8 h-8 flex items-center justify-center border border-gray-700/30 rounded-xl hover:bg-[#252525] text-white transition-all duration-200"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-medium text-white">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.menuItemId, item.quantity + 1, item.modifiers)}
                        className="w-8 h-8 flex items-center justify-center border border-gray-700/30 rounded-xl hover:bg-[#252525] text-white transition-all duration-200"
                      >
                        +
                      </button>
                    </div>
                    <span className="font-bold text-amber-600">
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
          <div className="flex items-center justify-between py-2 border-t border-b border-gray-800/50">
            <span className="text-gray-300">Add more items</span>
            <button
              onClick={() => navigate('/customer/menu')}
              className="px-4 py-2 bg-amber-700 text-white rounded-xl hover:bg-amber-600 transition-all duration-200 text-sm font-medium"
            >
              [+ Browse Menu]
            </button>
          </div>
        </div>

        {/* Special Instructions */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Special Instructions (Order):
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full px-4 py-3 bg-[#252525] text-white border border-gray-700/30 rounded-xl focus:ring-2 focus:ring-amber-700/30 focus:border-amber-700/50 transition-all duration-200 placeholder:text-gray-500"
            rows={3}
            placeholder="We're celebrating birthday!"
          />
        </div>

        {/* Subtotal */}
        <div className="mb-6 border-t border-gray-800/50 pt-4">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-white">Subtotal:</span>
            <span className="text-lg font-bold text-amber-600">{formatVND(getTotal())}</span>
          </div>
        </div>

        {/* Place Order Button */}
        <button
          onClick={handlePlaceOrder}
          disabled={isPlacingOrder || !tableId || tableId === 0}
          className="w-full px-6 py-3 bg-amber-700 text-white rounded-xl hover:bg-amber-600 transition-all duration-200 font-medium disabled:bg-gray-700 disabled:cursor-not-allowed mb-4"
        >
          {isPlacingOrder ? 'Placing Order...' : 'Place Order'}
        </button>

        {/* Info Message */}
        <div className="flex items-start gap-2 text-sm text-gray-400">
          <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>You can add more orders during your visit</p>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};
