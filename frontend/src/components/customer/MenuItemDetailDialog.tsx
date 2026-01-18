import React, { useState, useEffect, useMemo } from 'react';
import type { ModifierGroup } from '@aerodine/shared-types';
import type { CartItemModifier } from '../../store/cartStore';
import { formatVND } from '../../utils/currency';
import { menusApi } from '../../services/api';

interface MenuItemDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  menuItem: {
    id: number;
    name: string;
    description?: string;
    basePrice: number;
    status: string;
    images?: Array<{
      id: number;
      url: string;
    }>;
    modifierGroups?: Array<{
      modifierGroup: ModifierGroup;
    }>;
  };
  onAddToCart: (modifiers: CartItemModifier[], totalPrice: number, note?: string) => void;
}

interface ReviewData {
  averageRating: number;
  totalReviews: number;
}

export const MenuItemDetailDialog: React.FC<MenuItemDetailDialogProps> = ({
  isOpen,
  onClose,
  menuItem,
  onAddToCart,
}) => {
  const [selectedModifiers, setSelectedModifiers] = useState<Map<number, number[]>>(new Map());
  const [note, setNote] = useState('');
  const [reviewData, setReviewData] = useState<ReviewData | null>(null);
  const [loadingReviews, setLoadingReviews] = useState(false);

  // Calculate modifierGroups using useMemo to ensure it updates when menuItem changes
  const modifierGroups = useMemo(() => {
    if (!menuItem.modifierGroups || menuItem.modifierGroups.length === 0) {
      return [];
    }
    
    const groups = menuItem.modifierGroups
      .map((mg) => mg.modifierGroup)
      .filter((mg) => {
        // Filter out groups without id or without options
        if (!mg || !mg.id) return false;
        // Include groups even if they don't have options yet (options might be loaded separately)
        // But we'll check for options in the render
        return true;
      });
    
    return groups;
  }, [menuItem.modifierGroups]);

  useEffect(() => {
    if (isOpen) {
      // Initialize selections based on minSelection requirements
      const initial = new Map<number, number[]>();
      modifierGroups.forEach((group) => {
        if (!group.id) return;
        if (group.minSelection && group.minSelection > 0 && group.options && group.options.length > 0) {
          // Pre-select first option if minSelection > 0
          const firstOptionId = group.options[0].id;
          if (firstOptionId) {
            initial.set(group.id, [firstOptionId]);
          } else {
            initial.set(group.id, []);
          }
        } else {
          initial.set(group.id, []);
        }
      });
      setSelectedModifiers(initial);
      setNote('');
      
      // Load reviews
      loadReviews();
    } else {
      // Reset when dialog closes
      setSelectedModifiers(new Map());
      setNote('');
      setReviewData(null);
    }
  }, [isOpen, menuItem.id, modifierGroups]);

  const loadReviews = async () => {
    setLoadingReviews(true);
    try {
      const data = await menusApi.getMenuItemReviews(menuItem.id);
      setReviewData({
        averageRating: data.averageRating || 0,
        totalReviews: data.totalReviews || 0,
      });
    } catch (error) {
      console.error('Failed to load reviews:', error);
      setReviewData({
        averageRating: 0,
        totalReviews: 0,
      });
    } finally {
      setLoadingReviews(false);
    }
  };

  const toggleOption = (groupId: number, optionId: number) => {
    const group = modifierGroups.find((g) => g.id === groupId);
    if (!group || !group.id) return;

    const current = selectedModifiers.get(groupId) || [];
    const isSelected = current.includes(optionId);
    const maxSelection = group.maxSelection || 1;

    let newSelection: number[];

    if (isSelected) {
      // Deselect
      newSelection = current.filter((id) => id !== optionId);
    } else {
      // Select
      if (maxSelection === 1) {
        // Single selection - replace
        newSelection = [optionId];
      } else {
        // Multiple selection - add if under limit
        if (current.length < maxSelection) {
          newSelection = [...current, optionId];
        } else {
          // At max, replace last
          newSelection = [...current.slice(1), optionId];
        }
      }
    }

    setSelectedModifiers(new Map(selectedModifiers).set(groupId, newSelection));
  };

  const calculateTotalPrice = (): number => {
    let total = menuItem.basePrice;
    selectedModifiers.forEach((optionIds, groupId) => {
      const group = modifierGroups.find((g) => g.id === groupId);
      if (group && group.options) {
        optionIds.forEach((optionId) => {
          const option = group.options!.find((o) => o.id === optionId);
          if (option) {
            const priceAdjustment = Number(option.priceAdjustment) || 0;
            total += priceAdjustment;
          }
        });
      }
    });
    return total;
  };

  const validateSelection = (): boolean => {
    for (const group of modifierGroups) {
      if (!group.id) continue;
      const selected = selectedModifiers.get(group.id) || [];
      const minSelection = group.minSelection || 0;
      if (selected.length < minSelection) {
        return false;
      }
    }
    return true;
  };

  const handleAddToCart = () => {
    if (modifierGroups.length > 0 && !validateSelection()) {
      alert('Please select the required modifiers');
      return;
    }

    const modifiers: CartItemModifier[] = [];
    selectedModifiers.forEach((optionIds, groupId) => {
      const group = modifierGroups.find((g) => g.id === groupId);
      if (group && group.id && group.options) {
        optionIds.forEach((optionId) => {
          const option = group.options!.find((o) => o.id === optionId);
          if (option) {
            const priceAdjustment = Number(option.priceAdjustment) || 0;
            modifiers.push({
              modifierGroupId: groupId,
              modifierGroupName: group.name,
              modifierOptionId: optionId,
              modifierName: option.name,
              priceAdjustment,
            });
          }
        });
      }
    });

    onAddToCart(modifiers, calculateTotalPrice(), note.trim() || undefined);
    onClose();
  };

  if (!isOpen) return null;

  const totalPrice = calculateTotalPrice();
  const isValid = modifierGroups.length === 0 || validateSelection();
  const isAvailable = menuItem.status === 'AVAILABLE';
  const averageRating = reviewData?.averageRating || 0;
  const totalReviews = reviewData?.totalReviews || 0;

  // Render stars
  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <div className="flex items-center gap-1">
        {[...Array(fullStars)].map((_, i) => (
          <svg key={i} className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
          </svg>
        ))}
        {hasHalfStar && (
          <svg className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
            <defs>
              <linearGradient id="half-fill">
                <stop offset="50%" stopColor="currentColor" />
                <stop offset="50%" stopColor="transparent" stopOpacity="1" />
              </linearGradient>
            </defs>
            <path fill="url(#half-fill)" d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
          </svg>
        )}
        {[...Array(emptyStars)].map((_, i) => (
          <svg key={i} className="w-5 h-5 text-gray-600 fill-current" viewBox="0 0 20 20">
            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
          </svg>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 overflow-y-auto">
      <div className="bg-[#1a1a1a] rounded-lg shadow-2xl max-w-2xl w-full mx-4 my-8 max-h-[90vh] overflow-hidden flex flex-col border border-gray-800">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700 flex-shrink-0 bg-[#1f1f1f]">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">{menuItem.name}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-3xl font-bold leading-none transition-colors"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 bg-[#1a1a1a]">
          <div className="space-y-6">
            {/* Image */}
            {menuItem.images && menuItem.images.length > 0 && (
              <div className="w-full h-64 rounded-lg overflow-hidden bg-gray-800 border border-gray-700">
                <img
                  src={menuItem.images[0].url}
                  alt={menuItem.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=No+Image';
                  }}
                />
              </div>
            )}

            {/* Price */}
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-amber-600">
                {formatVND(Number(menuItem.basePrice))}
              </span>
              {isAvailable ? (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-300 font-medium">Có sẵn</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm text-gray-300 font-medium">Hết hàng</span>
                </div>
              )}
            </div>

            {/* Rating */}
            <div className="flex items-center gap-3">
              {loadingReviews ? (
                <div className="flex items-center gap-2">
                  <div className="w-20 h-5 bg-gray-700 rounded animate-pulse"></div>
                  <div className="w-24 h-4 bg-gray-700 rounded animate-pulse"></div>
                </div>
              ) : (
                <>
                  {renderStars(averageRating)}
                  <span className="text-sm text-gray-300">
                    {averageRating > 0 ? `${averageRating.toFixed(1)}` : 'Chưa có đánh giá'} ({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})
                  </span>
                </>
              )}
            </div>

            {/* Description */}
            {menuItem.description && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Mô tả</h3>
                <p className="text-gray-400 leading-relaxed">{menuItem.description}</p>
              </div>
            )}

            {/* Modifiers/Toppings */}
            {modifierGroups.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Tùy chọn</h3>
                <div className="space-y-4">
                  {modifierGroups.map((group) => {
                    if (!group.id) return null;
                    const groupId = group.id;
                    const selected = selectedModifiers.get(groupId) || [];
                    const minSelection = group.minSelection || 0;
                    const maxSelection = group.maxSelection || 1;
                    const isRequired = minSelection > 0;
                    const hasOptions = group.options && group.options.length > 0;

                    return (
                      <div key={groupId} className="border-b border-gray-700 pb-4 last:border-0">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-base font-semibold text-white">
                            {group.name}
                            {isRequired && <span className="text-red-400 ml-1">*</span>}
                          </h4>
                          <span className="text-sm text-gray-400">
                            {maxSelection === 1
                              ? 'Chọn 1'
                              : `Chọn ${minSelection}${maxSelection > minSelection ? `-${maxSelection}` : ''}`}
                          </span>
                        </div>
                        {hasOptions ? (
                          <div className="space-y-2">
                            {group.options!.map((option) => {
                              if (!option.id) return null;
                              const optionId = option.id;
                              const isSelected = selected.includes(optionId);
                              const isAvailable = option.isAvailable !== false;

                              return (
                                <label
                                  key={optionId}
                                  className={`flex items-center justify-between p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                                    isSelected
                                      ? 'border-amber-700 bg-amber-700/20'
                                      : 'border-gray-700 bg-[#1f1f1f] hover:border-gray-600'
                                  } ${!isAvailable ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                  <div className="flex items-center">
                                    {maxSelection === 1 ? (
                                      <input
                                        type="radio"
                                        name={`group-${groupId}`}
                                        checked={isSelected}
                                        onChange={() => toggleOption(groupId, optionId)}
                                        disabled={!isAvailable}
                                        className="mr-3 w-4 h-4 text-amber-700 focus:ring-amber-700 bg-gray-800 border-gray-600"
                                      />
                                    ) : (
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleOption(groupId, optionId)}
                                        disabled={!isAvailable || (!isSelected && selected.length >= maxSelection)}
                                        className="mr-3 w-4 h-4 text-amber-700 focus:ring-amber-700 rounded bg-gray-800 border-gray-600"
                                      />
                                    )}
                                    <span className="text-gray-200">{option.name}</span>
                                  </div>
                                  {(() => {
                                    const priceAdjustment = Number(option.priceAdjustment) || 0;
                                    return priceAdjustment !== 0 ? (
                                      <span
                                        className={`text-sm font-medium ${
                                          priceAdjustment > 0 ? 'text-green-400' : 'text-gray-400'
                                        }`}
                                      >
                                        {priceAdjustment > 0 ? '+' : ''}
                                        {formatVND(priceAdjustment)}
                                      </span>
                                    ) : null;
                                  })()}
                                </label>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400">Không có tùy chọn</p>
                        )}
                        {selected.length < minSelection && (
                          <p className="text-sm text-red-400 mt-2">
                            Vui lòng chọn ít nhất {minSelection} {minSelection > 1 ? 'tùy chọn' : 'tùy chọn'}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Ghi chú</h3>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Thêm ghi chú cho món ăn (tùy chọn)..."
                className="w-full px-4 py-3 border border-gray-700 rounded-lg focus:ring-2 focus:ring-amber-700/30 focus:border-amber-700/50 resize-none bg-[#1f1f1f] text-white placeholder-gray-500 transition-all duration-200"
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-700 bg-[#1f1f1f] flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <span className="text-lg font-semibold text-white">Tổng cộng</span>
            <span className="text-2xl font-bold text-amber-600">{formatVND(totalPrice)}</span>
          </div>
          <button
            onClick={handleAddToCart}
            disabled={!isValid || !isAvailable}
            className={`w-full py-3 rounded-xl font-medium transition-all duration-200 ${
              isValid && isAvailable
                ? 'bg-amber-700 text-white hover:bg-amber-600'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isAvailable ? 'Thêm vào giỏ hàng' : 'Hết hàng'}
          </button>
        </div>
      </div>
    </div>
  );
};
