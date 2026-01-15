/**
 * Format a number as Vietnamese Dong (VND)
 * @param amount - The amount to format
 * @returns Formatted string with VND currency symbol
 */
export const formatCurrency = (amount: number | string): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) {
    return '0 ₫';
  }

  // Format with thousand separators and no decimal places (VND doesn't use cents)
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numAmount);
};

/**
 * Format a number as VND with custom formatting (without currency symbol, just number + ₫)
 * @param amount - The amount to format
 * @returns Formatted string like "100.000 ₫"
 */
export const formatVND = (amount: number | string): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) {
    return '0 ₫';
  }

  // Format with thousand separators (using dots as per Vietnamese convention)
  const formatted = Math.round(numAmount).toLocaleString('vi-VN');
  return `${formatted} ₫`;
};
