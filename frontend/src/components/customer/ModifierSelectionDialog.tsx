import React, { useState, useEffect } from 'react';
import type { ModifierGroup } from '@aerodine/shared-types';
import type { CartItemModifier } from '../../store/cartStore';
import { formatVND } from '../../utils/currency';
import { useModal } from '../../contexts/ModalContext';

interface ModifierSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  itemName: string;
  basePrice: number;
  modifierGroups: ModifierGroup[];
  onConfirm: (modifiers: CartItemModifier[], totalPrice: number) => void;
}

export const ModifierSelectionDialog: React.FC<ModifierSelectionDialogProps> = ({
  isOpen,
  onClose,
  itemName,
  basePrice,
  modifierGroups,
  onConfirm,
}) => {
  const { alert } = useModal();
  const [selectedModifiers, setSelectedModifiers] = useState<Map<number, number[]>>(new Map());

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
    } else {
      // Reset when dialog closes
      setSelectedModifiers(new Map());
    }
  }, [isOpen, modifierGroups]);

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
    let total = Number(basePrice) || 0;
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

  const handleConfirm = async () => {
    if (!validateSelection()) {
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

    onConfirm(modifiers, calculateTotalPrice());
    onClose();
  };

  if (!isOpen) return null;

  const totalPrice = calculateTotalPrice();
  const isValid = validateSelection();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#8A9A5B]/20 bg-[#8A9A5B]">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">{itemName}</h2>
            <button
              onClick={onClose}
              className="text-white hover:text-[#F9F7F2] text-2xl font-bold"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <p className="text-sm text-white/90 mt-1">Customize your order</p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-6">
            {modifierGroups.map((group) => {
              if (!group.id) return null;
              const groupId = group.id;
              const selected = selectedModifiers.get(groupId) || [];
              const minSelection = group.minSelection || 0;
              const maxSelection = group.maxSelection || 1;
              const isRequired = minSelection > 0;

              return (
                <div key={groupId} className="border-b border-[#8A9A5B]/20 pb-4 last:border-0">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-[#36454F]">
                      {group.name}
                      {isRequired && <span className="text-red-500 ml-1">*</span>}
                    </h3>
                    <span className="text-sm text-[#36454F]/70">
                      {maxSelection === 1
                        ? 'Select 1'
                        : `Select ${minSelection}${maxSelection > minSelection ? `-${maxSelection}` : ''}`}
                    </span>
                  </div>
                  {group.options && group.options.length > 0 ? (
                    <div className="space-y-2">
                      {group.options.map((option) => {
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
                                : 'border-[#8A9A5B]/30 hover:border-[#8A9A5B]'
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
                                  className="mr-3 w-4 h-4 text-[#8A9A5B] focus:ring-[#8A9A5B]"
                                />
                              ) : (
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleOption(groupId, optionId)}
                                  disabled={!isAvailable || (!isSelected && selected.length >= maxSelection)}
                                  className="mr-3 w-4 h-4 text-[#8A9A5B] focus:ring-[#8A9A5B] rounded"
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
                    <p className="text-sm text-[#36454F]/70">No options available</p>
                  )}
                  {selected.length < minSelection && (
                    <p className="text-sm text-red-500 mt-2">
                      Please select at least {minSelection} option{minSelection > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#8A9A5B]/20 bg-[#F9F7F2]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-lg font-semibold text-[#36454F]">Total</span>
            <span className="text-2xl font-bold text-[#8A9A5B]">{formatVND(totalPrice)}</span>
          </div>
          <button
            onClick={handleConfirm}
            disabled={!isValid}
            className={`w-full py-3 rounded-lg font-medium transition-colors ${
              isValid
                ? 'bg-[#D4AF37] text-white hover:bg-[#B8941F]'
                : 'bg-[#8A9A5B]/30 text-[#36454F]/50 cursor-not-allowed'
            }`}
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
};
