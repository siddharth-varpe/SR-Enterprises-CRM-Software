/**
 * Centralized formatting utilities for SR Enterprises CRM
 */

/**
 * Formats a monetary amount into standard Indian Rupees (₹) string.
 * Example: 1250.5 -> "₹1,250.50"
 */
export function formatINR(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return '₹0.00';
  }
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `₹${numericAmount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export const formatCurrency = formatINR;

export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return '0';
  }
  return Number(value).toLocaleString('en-IN');
}

/**
 * Formats a date into Indian date string.
 * Example: 2026-08-18 -> "18 Aug 2026"
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Formats a date with time.
 * Example: "18 Aug 2026, 10:30 AM"
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}
