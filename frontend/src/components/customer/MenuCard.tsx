import React from 'react';
import type { Menu } from '@aerodine/shared-types';
import { formatVND } from '../../utils/currency';

interface MenuCardProps {
  item: Menu;
  onAddToCart?: (item: Menu) => void;
}

export const MenuCard: React.FC<MenuCardProps> = ({ item, onAddToCart }) => {
  const handleAddToCart = () => {
    if (onAddToCart) {
      onAddToCart(item);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200">
      {item.image && (
        <div className="w-full h-48 overflow-hidden">
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x200?text=No+Image';
            }}
          />
        </div>
      )}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">{item.name}</h3>
        {item.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-xl font-bold text-[#eba157]">
            {formatVND(typeof item.price === 'number' ? item.price : 0)}
          </span>
          {item.available !== false && onAddToCart && (
            <button
              onClick={handleAddToCart}
              className="px-4 py-2 bg-[#eba157] text-white rounded-lg hover:bg-[#d88f3f] transition-colors duration-200 font-medium"
            >
              Add to Cart
            </button>
          )}
          {item.available === false && (
            <span className="px-3 py-1 bg-gray-200 text-gray-600 rounded text-sm font-medium">
              Sold Out
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
