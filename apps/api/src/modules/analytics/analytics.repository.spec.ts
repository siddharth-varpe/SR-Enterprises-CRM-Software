import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalyticsRepository } from './analytics.repository';
import { db } from '../../database/client';
import { memoryInvoices } from '../invoices/invoices.repository';
import { memoryPayments } from '../payments/payments.repository';
import { memorySales } from '../sales/sales.repository';

// Mock drizzle database client
vi.mock('../../database/client', () => ({
  db: {
    select: vi.fn(),
  },
}));

describe('AnalyticsRepository — First-Principles Data Accuracy', () => {
  let repository: AnalyticsRepository;

  beforeEach(() => {
    repository = new AnalyticsRepository();
    vi.clearAllMocks();

    // Populate in-memory arrays to simulate offline / cache items
    memoryInvoices.length = 0;
    memoryPayments.length = 0;
    memorySales.length = 0;

    memoryInvoices.push({
      id: 'mem-inv-1',
      invoiceNumber: 'INV-MEM-001',
      totalAmount: '20.00',
      status: 'PAID',
      createdAt: new Date('2026-09-01T10:00:00Z'),
    });
    memoryInvoices.push({
      id: 'mem-inv-2',
      invoiceNumber: 'INV-MEM-002',
      totalAmount: '50.00',
      status: 'ISSUED',
      createdAt: new Date('2026-09-02T10:00:00Z'),
    });

    memoryPayments.push({
      id: 'mem-pay-1',
      amount: '20.00',
      status: 'COMPLETED',
      createdAt: new Date('2026-09-01T10:00:00Z'),
    });

    memorySales.push({
      id: 'mem-sale-1',
      totalAmount: '15000.00',
      status: 'COMPLETED',
      createdAt: new Date('2026-09-01T10:00:00Z'),
    });
  });

  it('getRevenueMetrics does NOT double revenue or inflate invoice counts from memory when DB queries succeed', async () => {
    // Database returns: 1 invoice of ₹20, 1 payment of ₹20
    const mockSelect = vi.fn();
    (db.select as any) = mockSelect;

    // The Promise.all in getRevenueMetrics executes 8 select queries
    mockSelect
      // 1. invoiceSummary
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ grossBilled: '20.00', count: 1 }]),
        }),
      })
      // 2. paymentSummary
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ amountCollected: '20.00', count: 1 }]),
        }),
      })
      // 3. billedAll
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ total: '0.00' }]),
        }),
      })
      // 4. paidAll
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ total: '0.00' }]),
          }),
        }),
      })
      // 5. overdueSummary
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ overdue: '0.00', count: 0 }]),
        }),
      })
      // 6. serviceInvoiceSummary
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              { partsRevenue: '0.00', labourRevenue: '0.00', feesRevenue: '0.00', totalServiceRevenue: '0.00' },
            ]),
          }),
        }),
      })
      // 7. invoiceStatuses
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockResolvedValue([{ status: 'PAID', count: 1 }]),
          }),
        }),
      })
      // 8. billedTrend
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockResolvedValue([{ date: '2026-09-01', billed: '20.00' }]),
          }),
        }),
      })
      // 9. collectedTrend
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockResolvedValue([{ date: '2026-09-01', collected: '20.00' }]),
          }),
        }),
      });

    const result = await repository.getRevenueMetrics({
      startDate: new Date('2026-09-01T00:00:00Z'),
      endDate: new Date('2026-09-16T23:59:59Z'),
    });

    // Real, un-inflated numbers matching actual DB:
    expect(result.grossBilled).toBe(20.0);
    expect(result.totalInvoicesIssued).toBe(1);
    expect(result.amountCollected).toBe(20.0);
    expect(result.outstandingAmount).toBe(0);
    expect(result.paidInvoicesCount).toBe(1);
    expect(result.collectionRate).toBe(100);
  });

  it('getSalesMetrics does NOT double sales counts or sales revenue from memory when DB queries succeed', async () => {
    const mockSelect = vi.fn();
    (db.select as any) = mockSelect;

    mockSelect
      // 1. summary
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ totalAmount: '12000.00', count: 1 }]),
        }),
      })
      // 2. trendRaw
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue([{ date: '2026-09-01', value: '12000.00', secondaryValue: 1 }]),
            }),
          }),
        }),
      })
      // 3. byProduct
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([]),
                }),
              }),
            }),
          }),
        }),
      })
      // 4. byCustomerType
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      })
      // 5. byCategoryRaw
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                groupBy: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      });

    const result = await repository.getSalesMetrics({
      startDate: new Date('2026-09-01T00:00:00Z'),
      endDate: new Date('2026-09-16T23:59:59Z'),
    });

    expect(result.totalAmount).toBe(12000.0);
    expect(result.count).toBe(1);
  });

  it('getPaymentMetrics does NOT double payments or collection amount from memory when DB queries succeed', async () => {
    const mockSelect = vi.fn();
    (db.select as any) = mockSelect;

    mockSelect
      // 1. summary
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ totalAmount: '20.00', count: 1 }]),
        }),
      })
      // 2. methods
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockResolvedValue([{ method: 'UPI', count: 1, totalAmount: '20.00' }]),
          }),
        }),
      })
      // 3. trendRaw
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue([{ date: '2026-09-01', value: '20.00', secondaryValue: 1 }]),
            }),
          }),
        }),
      })
      // 4. partialSummary
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 0 }]),
        }),
      });

    const result = await repository.getPaymentMetrics({
      startDate: new Date('2026-09-01T00:00:00Z'),
      endDate: new Date('2026-09-16T23:59:59Z'),
    });

    expect(result.totalPayments).toBe(20.0);
    expect(result.paymentCount).toBe(1);
  });
});
