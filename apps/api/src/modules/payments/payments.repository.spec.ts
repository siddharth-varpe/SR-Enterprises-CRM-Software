import { describe, it, expect } from 'vitest';
import { paymentsRepository } from './payments.repository';
import { db } from '../../database/client';
import { customers, invoices, payments } from '../../database/schema/index';
import { eq } from 'drizzle-orm';

describe('PaymentsRepository - Pending & Partially Paid Invoices & Payments', () => {
  it('returns all pending / unpaid and partially paid invoices when status is PENDING', async () => {
    const result = await paymentsRepository.findPaginated({
      status: 'PENDING' as any,
      page: 1,
      limit: 50,
    });

    expect(result).toBeDefined();
    expect(result.data).toBeInstanceOf(Array);
    expect(result.pagination).toBeDefined();

    // Check that every returned pending item has positive outstanding balance
    for (const item of result.data) {
      expect(['PENDING', 'PARTIALLY_PAID']).toContain(item.status);
      expect(parseFloat(item.amount)).toBeGreaterThan(0);
      expect(item.invoiceId).toBeDefined();
      expect(item.customerId).toBeDefined();
      expect(item.customerName).toBeDefined();
    }
  });

  it('calculates KPIs including pending dues and completed collections', async () => {
    const kpis = await paymentsRepository.getKPIs();
    expect(kpis).toBeDefined();
    expect(typeof kpis.totalCollected).toBe('number');
    expect(typeof kpis.totalInvoiced).toBe('number');
    expect(typeof kpis.totalOutstanding).toBe('number');
    expect(typeof kpis.pendingPaymentsCount).toBe('number');
  });
});
