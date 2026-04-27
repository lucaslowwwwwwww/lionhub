/**
 * Format a date string for display.
 * @param {string} isoDate — e.g. "2026-01-30"
 * @returns {string} e.g. "Thu, 30 Jan 2026"
 */
export function formatDate(isoDate) {
  return new Date(isoDate).toLocaleDateString('en-MY', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
