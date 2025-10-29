/**
 * Date formatting utility functions
 */

/**
 * Format a date string to a localized date and time
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString();
}

/**
 * Format a date string to a localized date only
 */
export function formatDateOnly(dateString: string): string {
  return new Date(dateString).toLocaleDateString();
}

/**
 * Format a date string to a localized time only
 */
export function formatTimeOnly(dateString: string): string {
  return new Date(dateString).toLocaleTimeString();
}
