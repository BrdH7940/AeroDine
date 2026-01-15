import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../../store/cartStore';
import { CartItem } from '../../components/customer';
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
      const orderData = {
        tableId,
        restaurantId: restaurantId || 1, // Default to 1 if not set
        guestCount,
        note: note || undefined,
        items: items.map((item) => ({
          menuItemId: item.menuItemId,
          name: item.name,
          quantity: item.quantity,
          pricePerUnit: item.basePrice + (item.modifiers?.reduce((sum, mod) => sum + mod.priceAdjustment, 0) || 0),
          note: item.note,
          modifiers: item.modifiers?.map((mod) => ({
            modifierOptionId: mod.modifierOptionId,
            modifierName: mod.modifierName,
            priceAdjustment: mod.priceAdjustment,
          })),
        })),
      };

      const response = await apiClient.post('/orders', orderData);
      
      // Clear cart after successful order
      clearCart();
      
      // Navigate to order tracking page
      navigate(`/customer/orders/${response.data.id}`);
    } catch (error: any) {
      console.error('Failed to place order:', error);
      alert(error.response?.data?.message || 'Failed to place order. Please try again.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Your cart is empty</h2>
          <button
            onClick={() => navigate('/customer/menu')}
            className="px-6 py-3 bg-[#eba157] text-white rounded-lg hover:bg-[#d88f3f] transition-colors duration-200 font-medium"
          >
            Browse Menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Shopping Cart</h1>
        <button
          onClick={() => navigate('/customer/menu')}
          className="px-4 py-2 text-[#eba157] hover:text-[#d88f3f] font-medium"
        >
          Continue Shopping
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="space-y-4">
            {items.map((item, index) => (
              <CartItem
                key={`${item.menuItemId}-${index}`}
                item={item}
                onUpdateQuantity={updateQuantity}
                onRemove={removeItem}
              />
            ))}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Order Summary</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Table Number
              </label>
              <input
                type="number"
                value={tableId || ''}
                onChange={(e) => setTableId(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eba157] focus:border-transparent"
                placeholder="Enter table number"
                min="1"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Guests
              </label>
              <input
                type="number"
                value={guestCount}
                onChange={(e) => setGuestCount(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eba157] focus:border-transparent"
                min="1"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Special Instructions (Optional)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eba157] focus:border-transparent"
                rows={3}
                placeholder="Any special requests or instructions..."
              />
            </div>

            <div className="border-t border-gray-200 pt-4 mb-4">
              <div className="flex justify-between text-gray-600 mb-2">
                <span>Items ({getItemCount()})</span>
                <span>{formatVND(getTotal())}</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-gray-800">
                <span>Total</span>
                <span>{formatVND(getTotal())}</span>
              </div>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={isPlacingOrder || !tableId}
              className="w-full px-6 py-3 bg-[#eba157] text-white rounded-lg hover:bg-[#d88f3f] transition-colors duration-200 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isPlacingOrder ? 'Placing Order...' : 'Place Order'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
