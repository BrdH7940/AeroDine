import React, { useState, useEffect, useMemo } from 'react';
import type { ModifierGroup } from '@aerodine/shared-types';
import type { CartItemModifier } from '../../store/cartStore';
import { formatVND } from '../../utils/currency';
import { menusApi } from '../../services/api';
import { useModal } from '../../contexts/ModalContext';
import { useUserStore } from '../../store/userStore';

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
  reviews?: Array<{
    id: number;
    rating: number;
    comment?: string;
    createdAt: string;
    user: {
      id: number;
      fullName: string;
      email: string;
    };
  }>;
}

export const MenuItemDetailDialog: React.FC<MenuItemDetailDialogProps> = ({
  isOpen,
  onClose,
  menuItem,
  onAddToCart,
}) => {
  const { alert } = useModal();
  const { user, isAuthenticated } = useUserStore();
  const [selectedModifiers, setSelectedModifiers] = useState<Map<number, number[]>>(new Map());
  const [note, setNote] = useState('');
  const [reviewData, setReviewData] = useState<ReviewData | null>(null);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

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
        reviews: data.reviews || [],
      });
    } catch (error) {
      console.error('Failed to load reviews:', error);
      setReviewData({
        averageRating: 0,
        totalReviews: 0,
        reviews: [],
      });
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!isAuthenticated) {
      await alert({
        title: 'Cần đăng nhập',
        message: 'Vui lòng đăng nhập để đánh giá món ăn',
        type: 'warning',
      });
      return;
    }

    if (reviewRating < 1 || reviewRating > 5) {
      await alert({
        title: 'Lỗi',
        message: 'Vui lòng chọn điểm đánh giá từ 1 đến 5 sao',
        type: 'error',
      });
      return;
    }

    setSubmittingReview(true);
    try {
      await menusApi.createReview(menuItem.id, {
        rating: reviewRating,
        comment: reviewComment.trim() || undefined,
      });
      
      await alert({
        title: 'Thành công',
        message: 'Đánh giá của bạn đã được gửi',
        type: 'success',
      });

      // Reload reviews
      await loadReviews();
      
      // Reset form
      setShowReviewForm(false);
      setReviewRating(5);
      setReviewComment('');
    } catch (error: any) {
      console.error('Failed to submit review:', error);
      await alert({
        title: 'Lỗi',
        message: error.response?.data?.message || 'Không thể gửi đánh giá. Vui lòng thử lại.',
        type: 'error',
      });
    } finally {
      setSubmittingReview(false);
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
    let total = Number(menuItem.basePrice) || 0;
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

  const handleAddToCart = async () => {
    if (modifierGroups.length > 0 && !validateSelection()) {
      await alert({
        title: 'Thiếu thông tin',
        message: 'Please select the required modifiers',
        type: 'warning',
      });
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
          <svg key={i} className="w-5 h-5 text-[#D4AF37] fill-current" viewBox="0 0 20 20">
            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
          </svg>
        ))}
        {hasHalfStar && (
          <svg className="w-5 h-5 text-[#D4AF37] fill-current" viewBox="0 0 20 20">
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
          <svg key={i} className="w-5 h-5 text-[#8A9A5B]/30 fill-current" viewBox="0 0 20 20">
            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
          </svg>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md overflow-y-auto">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full mx-4 my-8 max-h-[90vh] overflow-hidden flex flex-col border border-[#8A9A5B]/20">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#8A9A5B]/20 flex-shrink-0 bg-[#8A9A5B]">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">{menuItem.name}</h2>
            <button
              onClick={onClose}
              className="text-white hover:text-[#F9F7F2] text-3xl font-bold leading-none transition-colors"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 bg-white">
          <div className="space-y-6">
            {/* Image */}
            {menuItem.images && menuItem.images.length > 0 && (
              <div className="w-full h-64 rounded-lg overflow-hidden bg-[#F9F7F2] border border-[#8A9A5B]/20">
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
              <span className="text-3xl font-bold text-[#8A9A5B]">
                {formatVND(Number(menuItem.basePrice))}
              </span>
              {isAvailable ? (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-[#8A9A5B] rounded-full"></div>
                  <span className="text-sm text-[#36454F] font-medium">Có sẵn</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm text-[#36454F] font-medium">Hết hàng</span>
                </div>
              )}
            </div>

            {/* Rating */}
            <div className="flex items-center gap-3">
              {loadingReviews ? (
                <div className="flex items-center gap-2">
                  <div className="w-20 h-5 bg-[#F9F7F2] rounded animate-pulse"></div>
                  <div className="w-24 h-4 bg-[#F9F7F2] rounded animate-pulse"></div>
                </div>
              ) : (
                <>
                  {renderStars(averageRating)}
                  <span className="text-sm text-[#36454F]/70">
                    {averageRating > 0 ? `${averageRating.toFixed(1)}` : 'Chưa có đánh giá'} ({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})
                  </span>
                </>
              )}
            </div>

            {/* Description */}
            {menuItem.description && (
              <div>
                <h3 className="text-lg font-semibold text-[#36454F] mb-2">Mô tả</h3>
                <p className="text-[#36454F]/70 leading-relaxed">{menuItem.description}</p>
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
                      <div key={groupId} className="border-b border-[#8A9A5B]/20 pb-4 last:border-0">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-base font-semibold text-[#36454F]">
                            {group.name}
                            {isRequired && <span className="text-red-400 ml-1">*</span>}
                          </h4>
                          <span className="text-sm text-[#36454F]/70">
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
                                      ? 'border-[#8A9A5B] bg-[#8A9A5B]/10'
                                      : 'border-[#8A9A5B]/30 bg-white hover:border-[#8A9A5B]'
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
                                        className="mr-3 w-4 h-4 text-[#8A9A5B] focus:ring-[#8A9A5B] bg-white border-[#8A9A5B]/30"
                                      />
                                    ) : (
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleOption(groupId, optionId)}
                                        disabled={!isAvailable || (!isSelected && selected.length >= maxSelection)}
                                        className="mr-3 w-4 h-4 text-[#8A9A5B] focus:ring-[#8A9A5B] rounded bg-white border-[#8A9A5B]/30"
                                      />
                                    )}
                                    <span className="text-[#36454F]">{option.name}</span>
                                  </div>
                                  {(() => {
                                    const priceAdjustment = Number(option.priceAdjustment) || 0;
                                    return priceAdjustment !== 0 ? (
                                      <span
                                        className={`text-sm font-medium ${
                                          priceAdjustment > 0 ? 'text-[#8A9A5B]' : 'text-[#36454F]/70'
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
                          <p className="text-sm text-[#36454F]/70">Không có tùy chọn</p>
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
              <h3 className="text-lg font-semibold text-[#36454F] mb-2">Ghi chú</h3>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Thêm ghi chú cho món ăn (tùy chọn)..."
                className="w-full px-4 py-3 border border-[#8A9A5B]/30 rounded-lg focus:ring-2 focus:ring-[#8A9A5B]/30 focus:border-[#8A9A5B] resize-none bg-white text-[#36454F] placeholder-[#36454F]/50 transition-all duration-200"
                rows={3}
              />
            </div>

            {/* Reviews Section */}
            <div className="border-t border-[#8A9A5B]/20 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#36454F]">Đánh giá</h3>
                {isAuthenticated && (
                  <button
                    onClick={() => setShowReviewForm(!showReviewForm)}
                    className="text-sm text-[#8A9A5B] hover:text-[#6B7A4A] font-medium"
                  >
                    {showReviewForm ? 'Hủy' : 'Viết đánh giá'}
                  </button>
                )}
              </div>

              {/* Review Form */}
              {showReviewForm && isAuthenticated && (
                <div className="mb-6 p-4 bg-[#F9F7F2] rounded-lg border border-[#8A9A5B]/20">
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-[#36454F] mb-2">
                      Đánh giá của bạn
                    </label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewRating(star)}
                          className="focus:outline-none"
                        >
                          <svg
                            className={`w-8 h-8 ${
                              star <= reviewRating
                                ? 'text-[#D4AF37] fill-current'
                                : 'text-[#8A9A5B]/30'
                            }`}
                            viewBox="0 0 20 20"
                          >
                            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                          </svg>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-[#36454F] mb-2">
                      Nhận xét (tùy chọn)
                    </label>
                    <textarea
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Chia sẻ trải nghiệm của bạn..."
                      className="w-full px-4 py-3 border border-[#8A9A5B]/30 rounded-lg focus:ring-2 focus:ring-[#8A9A5B]/30 focus:border-[#8A9A5B] resize-none bg-white text-[#36454F] placeholder-[#36454F]/50"
                      rows={3}
                    />
                  </div>
                  <button
                    onClick={handleSubmitReview}
                    disabled={submittingReview}
                    className="w-full py-2 px-4 bg-[#8A9A5B] text-white rounded-lg hover:bg-[#6B7A4A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submittingReview ? 'Đang gửi...' : 'Gửi đánh giá'}
                  </button>
                </div>
              )}

              {/* Reviews List */}
              {reviewData && reviewData.reviews && reviewData.reviews.length > 0 && (
                <div className="space-y-4 max-h-64 overflow-y-auto">
                  {reviewData.reviews.map((review) => (
                    <div key={review.id} className="border-b border-[#8A9A5B]/20 pb-4 last:border-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-[#36454F]">{review.user.fullName}</p>
                          <p className="text-xs text-[#36454F]/50">
                            {new Date(review.createdAt).toLocaleDateString('vi-VN')}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <svg
                              key={star}
                              className={`w-4 h-4 ${
                                star <= review.rating
                                  ? 'text-[#D4AF37] fill-current'
                                  : 'text-[#8A9A5B]/30'
                              }`}
                              viewBox="0 0 20 20"
                            >
                              <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                            </svg>
                          ))}
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-[#36454F]/70 mt-2">{review.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {reviewData && reviewData.totalReviews === 0 && (
                <p className="text-sm text-[#36454F]/50 text-center py-4">
                  Chưa có đánh giá nào. Hãy là người đầu tiên đánh giá món này!
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#8A9A5B]/20 bg-[#F9F7F2] flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <span className="text-lg font-semibold text-[#36454F]">Tổng cộng</span>
            <span className="text-2xl font-bold text-[#8A9A5B]">{formatVND(totalPrice)}</span>
          </div>
          <button
            onClick={handleAddToCart}
            disabled={!isValid || !isAvailable}
            className={`w-full py-3 rounded-xl font-medium transition-all duration-200 ${
              isValid && isAvailable
                ? 'bg-[#D4AF37] text-white hover:bg-[#B8941F]'
                : 'bg-[#8A9A5B]/30 text-[#36454F]/50 cursor-not-allowed'
            }`}
          >
            {isAvailable ? 'Thêm vào giỏ hàng' : 'Hết hàng'}
          </button>
        </div>
      </div>
    </div>
  );
};
