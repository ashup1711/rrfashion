/**
 * Format a number as Indian Rupee currency.
 * @param amount - The numeric amount to format.
 * @param options - Intl.NumberFormat options overrides.
 * @returns Formatted currency string (e.g., "₹1,200.00").
 */
export const formatCurrency = (
  amount: number,
  options?: Intl.NumberFormatOptions,
): string => {
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
export const formatCurrencyCompact = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};
