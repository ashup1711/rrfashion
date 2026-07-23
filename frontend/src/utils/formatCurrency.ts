/**
 * Format a number as Indian Rupee currency.
 * @param amount - The numeric amount to format (handles null/undefined).
 * @param options - Intl.NumberFormat options overrides.
 * @returns Formatted currency string (e.g., "₹1,200.00").
 */
export const formatCurrency = (
  amount: number | null | undefined,
  options?: Intl.NumberFormatOptions,
): string => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '₹0.00';
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(amount);
};

/**
 * Format a number as Indian Rupee without decimal places (for display on cards, etc.).
 */
export const formatCurrencyCompact = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '₹0';
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};
