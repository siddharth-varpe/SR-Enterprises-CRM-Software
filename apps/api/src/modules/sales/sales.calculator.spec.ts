import { describe, it, expect } from 'vitest';
import {
  calculateSaleLine,
  calculateSaleTotals,
  roundToTwo,
  formatMoney,
} from './sales.calculator';

describe('Sales Financial Calculator', () => {
  it('correctly calculates single line without discount at 18% GST', () => {
    const line = calculateSaleLine({
      quantity: 2,
      unitPrice: 1000,
      taxRatePercent: 18,
    });

    expect(line.quantity).toBe(2);
    expect(line.unitPrice).toBe('1000.00');
    expect(line.subtotal).toBe('2000.00');
    expect(line.discountAmount).toBe('0.00');
    expect(line.taxableAmount).toBe('2000.00');
    expect(line.taxRatePercent).toBe('18.00');
    expect(line.taxAmount).toBe('360.00');
    expect(line.lineTotal).toBe('2360.00');
  });

  it('correctly calculates single line with line-level discount', () => {
    const line = calculateSaleLine({
      quantity: 1,
      unitPrice: 15000,
      discountAmount: 1000,
      taxRatePercent: 18,
    });

    expect(line.subtotal).toBe('15000.00');
    expect(line.discountAmount).toBe('1000.00');
    expect(line.taxableAmount).toBe('14000.00');
    expect(line.taxAmount).toBe('2520.00'); // 14000 * 0.18
    expect(line.lineTotal).toBe('16520.00');
  });

  it('handles multi-item sales with document-level discount deterministically', () => {
    const items = [
      { quantity: 1, unitPrice: 18900, taxRatePercent: 18 }, // Kent Grand Plus (Subtotal: 18900, Tax: 3402)
      { quantity: 2, unitPrice: 450, taxRatePercent: 18 },   // 2 Carbon Filters (Subtotal: 900, Tax: 162)
      { quantity: 1, unitPrice: 1850, taxRatePercent: 18 },  // 1 RO Membrane (Subtotal: 1850, Tax: 333)
    ];

    const result = calculateSaleTotals(items, 650); // ₹650 extra discount

    expect(result.subtotal).toBe('21650.00'); // 18900 + 900 + 1850 = 21650
    expect(result.discountAmount).toBe('650.00');
    expect(result.taxAmount).toBe('3897.00'); // 3402 + 162 + 333 = 3897
    // Total = 21650 - 650 + 3897 = 24897.00
    expect(result.totalAmount).toBe('24897.00');
  });

  it('prevents discount from exceeding line subtotal or resulting in negative totals', () => {
    const line = calculateSaleLine({
      quantity: 1,
      unitPrice: 500,
      discountAmount: 10000, // Excessive discount capped at 500
      taxRatePercent: 18,
    });

    expect(line.subtotal).toBe('500.00');
    expect(line.discountAmount).toBe('500.00');
    expect(line.taxableAmount).toBe('0.00');
    expect(line.taxAmount).toBe('0.00');
    expect(line.lineTotal).toBe('0.00');
  });

  it('formats money and rounds half-up deterministically with no float leakage', () => {
    expect(roundToTwo(999.99)).toBe(999.99);
    expect(roundToTwo(999.994)).toBe(999.99);
    expect(roundToTwo(999.995)).toBe(1000);
    expect(formatMoney(1234.5)).toBe('1234.50');
  });
});
