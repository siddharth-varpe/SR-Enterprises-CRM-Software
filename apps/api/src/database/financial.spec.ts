import { describe, it, expect } from 'vitest';

export interface LineItemCalcInput {
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
  taxRatePercent?: number;
}

export interface LineItemCalcResult {
  subtotal: number;
  discount: number;
  taxableAmount: number;
  taxAmount: number;
  lineTotal: number;
}

/**
 * Deterministic Minor-Unit Rounding to 2 Decimal Places (Half-Up)
 */
export function roundToTwoDecimals(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Calculate Invoice Line Item Financial Values
 */
export function calculateLineItem(input: LineItemCalcInput): LineItemCalcResult {
  const subtotal = roundToTwoDecimals(input.quantity * input.unitPrice);
  const discount = roundToTwoDecimals(input.discountAmount ?? 0);
  const taxableAmount = Math.max(0, roundToTwoDecimals(subtotal - discount));
  const taxRate = input.taxRatePercent ?? 18;
  const taxAmount = roundToTwoDecimals((taxableAmount * taxRate) / 100);
  const lineTotal = roundToTwoDecimals(taxableAmount + taxAmount);

  return {
    subtotal,
    discount,
    taxableAmount,
    taxAmount,
    lineTotal,
  };
}

/**
 * Determine Financial Invoice Status from Balance & Due Date
 */
export function deriveInvoiceStatus(
  totalAmount: number,
  totalPaid: number,
  dueDate: Date,
  isCancelled: boolean,
  currentDate = new Date()
): 'PAID' | 'PARTIALLY_PAID' | 'ISSUED' | 'OVERDUE' | 'CANCELLED' {
  if (isCancelled) return 'CANCELLED';

  const outstanding = roundToTwoDecimals(totalAmount - totalPaid);
  if (outstanding <= 0) return 'PAID';

  const isOverdue = currentDate > dueDate;
  if (totalPaid > 0) {
    return isOverdue ? 'OVERDUE' : 'PARTIALLY_PAID';
  }

  return isOverdue ? 'OVERDUE' : 'ISSUED';
}

describe('Phase 1 — Financial Precision & Immutability Logic', () => {
  it('should calculate accurate line totals with 18% GST without floating point errors', () => {
    // 1 RO Machine @ 15,499.00 with 18% GST
    const result = calculateLineItem({
      quantity: 1,
      unitPrice: 15499.0,
      discountAmount: 500.0,
      taxRatePercent: 18.0,
    });

    expect(result.subtotal).toBe(15499.0);
    expect(result.discount).toBe(500.0);
    expect(result.taxableAmount).toBe(14999.0);
    expect(result.taxAmount).toBe(2699.82); // 14999 * 0.18
    expect(result.lineTotal).toBe(17698.82); // 14999 + 2699.82
  });

  it('should handle fractional paise prices without precision loss', () => {
    // 3 Sediment Filters @ 349.50 each with 18% GST
    const result = calculateLineItem({
      quantity: 3,
      unitPrice: 349.5,
      discountAmount: 0,
      taxRatePercent: 18.0,
    });

    expect(result.subtotal).toBe(1048.5);
    expect(result.taxAmount).toBe(188.73);
    expect(result.lineTotal).toBe(1237.23);
  });

  it('should derive PAID status when full amount is paid', () => {
    const dueDate = new Date('2026-09-01');
    const status = deriveInvoiceStatus(17698.82, 17698.82, dueDate, false);
    expect(status).toBe('PAID');
  });

  it('should derive PARTIALLY_PAID status when partial amount is paid before due date', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    const status = deriveInvoiceStatus(17698.82, 5000.0, futureDate, false);
    expect(status).toBe('PARTIALLY_PAID');
  });

  it('should derive OVERDUE status when outstanding amount exists past due date', () => {
    const pastDueDate = new Date('2026-01-01');
    const status = deriveInvoiceStatus(17698.82, 5000.0, pastDueDate, false);
    expect(status).toBe('OVERDUE');
  });

  it('should respect CANCELLED state over date/paid calculations', () => {
    const pastDueDate = new Date('2026-01-01');
    const status = deriveInvoiceStatus(17698.82, 0, pastDueDate, true);
    expect(status).toBe('CANCELLED');
  });
});
