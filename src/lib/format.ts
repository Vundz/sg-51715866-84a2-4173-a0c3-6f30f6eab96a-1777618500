/**
 * Format a number with comma separators
 * @param num - The number to format
 * @returns Formatted string with commas (e.g., 50000 -> "50,000")
 */
export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return "0";
  return num.toLocaleString('en-US');
}

/**
 * Format a number with optional decimal places
 * @param num - The number to format
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted string with commas
 */
export function formatNumberWithDecimals(num: number | null | undefined, decimals: number = 0): string {
  if (num === null || num === undefined) return "0";
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(0)}%`;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-ZM', {
    style: 'currency',
    currency: 'ZMW',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
