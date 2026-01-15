import React from 'react';
import type { CartItem as CartItemType } from '../../store/cartStore';
import { formatVND } from '../../utils/currency';

interface CartItemProps {
  item: CartItemType;
  onUpdateQuantity: (menuItemId: number, quantity: number, modifiers?: CartItemType['modifiers']) => void;
  onRemove: (menuItemId: number, modifiers?: CartItemType['modifiers']) => void;
}

export const CartItem: React.FC<CartItemProps> = ({ item, onUpdateQuantity, onRemove }) => {
  const itemPrice = item.basePrice + (item.modifiers?.reduce((sum, mod) => sum + mod.priceAdjustment, 0) || 0);
  const totalPrice = itemPrice * item.quantity;

  const handleDecrease = () => {
    if (item.quantity > 1) {
      onUpdateQuantity(item.menuItemId, item.quantity - 1, item.modifiers);
    } else {
      onRemove(item.menuItemId, item.modifiers);
    }
  };

  const handleIncrease = () => {
    onUpdateQuantity(item.menuItemId, item.quantity + 1, item.modifiers);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 flex items-start gap-4">
      {item.image && (
        <img
          src={item.image}
          alt={item.name}
          className="w-20 h-20 object-cover rounded"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/80x80?text=No+Image';
          }}
        />
      )}
      <div className="flex-1">
        <h4 className="font-semibold text-gray-800 mb-1">{item.name}</h4>
        {item.modifiers && item.modifiers.length > 0 && (
          <div className="text-sm text-gray-600 mb-2">
            {item.modifiers.map((mod, index) => (
              <div key={index}>
                {mod.modifierGroupName}: {mod.modifierName}
                {mod.priceAdjustment !== 0 && (
                  <span className="ml-1">
                    ({mod.priceAdjustment > 0 ? '+' : ''}{formatVND(mod.priceAdjustment)})
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
        {item.note && (
          <p className="text-sm text-gray-500 italic mb-2">Note: {item.note}</p>
        )}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleDecrease}
              className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center font-bold"
            >
              -
            </button>
            <span className="font-medium w-8 text-center">{item.quantity}</span>
            <button
              onClick={handleIncrease}
              className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center font-bold"
            >
              +
            </button>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-semibold text-lg">{formatVND(totalPrice)}</span>
            <button
              onClick={() => onRemove(item.menuItemId, item.modifiers)}
              className="text-red-500 hover:text-red-700 font-medium"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
