/**
 * Default GST rate for apparel below ₹1000.
 */
const DEFAULT_TAX_RATE = 12;

/**
 * Calculate GST tax breakdown for an order item.
 *
 * Default rates (apparel below ₹1000):
 * - Intra-state: CGST 6% + SGST 6% = 12%
 * - Inter-state: IGST 12%
 *
 * @param unitPrice - Price per unit in INR
 * @param quantity  - Number of units
 * @param isInterState - true for inter-state (IGST), false/undefined for intra-state (CGST+SGST)
 * @returns Tax breakdown with rounded amounts (2 decimal places)
 */
export function calculateTax(
  unitPrice: number,
  quantity: number,
  isInterState = false,
): {
  taxRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
} {
  const taxableValue = unitPrice * quantity;
  const totalTax = roundToTwoDecimals((taxableValue * DEFAULT_TAX_RATE) / 100);

  if (isInterState) {
    return {
      taxRate: DEFAULT_TAX_RATE,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: totalTax,
      totalTax,
    };
  }

  const halfTax = roundToTwoDecimals(totalTax / 2);
  return {
    taxRate: DEFAULT_TAX_RATE,
    cgstAmount: halfTax,
    sgstAmount: halfTax,
    igstAmount: 0,
    totalTax,
  };
}

/**
 * Determine if the shipping is inter-state based on store and shipping addresses.
 * Simplified: defaults to intra-state (same state) since we don't yet have
 * a store state configuration. Can be enhanced when store addresses are available.
 */
export function isInterStateShipping(
  _storeState?: string,
  _shippingState?: string,
): boolean {
  // Default to intra-state (CGST+SGST) for now
  // TODO: compare _storeState and _shippingState when store config is available
  return false;
}

/**
 * Round a number to 2 decimal places using standard rounding.
 */
function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}
