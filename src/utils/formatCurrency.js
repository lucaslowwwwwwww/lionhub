/**
 * Format a number as Malaysian Ringgit.
 * @param {number} amount
 * @returns {string} e.g. "RM 1,200.00"
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
    minimumFractionDigits: 2,
  }).format(amount)
}
