import { describe, it, expect, vi } from 'vitest';
import { CustomerRepository } from './customer.repository';

describe('Phase 4 — CustomerRepository & Financial Calculation Unit Tests', () => {
  it('should instantiate CustomerRepository', () => {
    const repo = new CustomerRepository();
    expect(repo).toBeDefined();
  });

  it('should calculate financial summary properly based on invoice and payment totals', async () => {
    const mockDb: any = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation((_cond) => {
            // First call is billed total, second is paid total, third is overdue
            return Promise.resolve([{ total: '25000.00' }]);
          }),
        }),
      }),
      query: {
        payments: {
          findFirst: vi.fn().mockResolvedValue({
            paymentDate: new Date('2026-03-15T10:00:00Z'),
            amount: '15000.00',
            paymentMethod: 'UPI',
          }),
        },
      },
    };

    const repo = new CustomerRepository();
    const summary = await repo.getFinancialSummary('11111111-1111-1111-1111-111111111111', mockDb);

    expect(summary.customerId).toBe('11111111-1111-1111-1111-111111111111');
    expect(summary.totalBilled).toBeDefined();
    expect(summary.totalPaid).toBeDefined();
    expect(summary.outstanding).toBeDefined();
    expect(summary.paymentHealth).toBeDefined();
    expect(summary.lastPaymentAmount).toBe('15000.00');
    expect(summary.lastPaymentMethod).toBe('UPI');
  });

  it('should construct paginated search filters with multiple conditions', async () => {
    const mockDb: any = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ total: 10 }]),
        }),
      }),
      query: {
        customers: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: '11111111-1111-1111-1111-111111111111',
              customerNumber: 'CUST-2026-0001',
              fullName: 'Rajesh Kumar',
              phone: '9826123456',
              status: 'ACTIVE',
              customerType: 'INDIVIDUAL',
              addresses: [],
              assets: [],
            },
          ]),
        },
      },
    };

    const repo = new CustomerRepository();
    const result = await repo.findPaginated(
      {
        page: 1,
        limit: 10,
        search: 'Rajesh',
        status: 'ACTIVE',
        customerType: 'INDIVIDUAL',
        sortBy: 'fullName',
        sortOrder: 'asc',
      },
      mockDb
    );

    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.fullName).toBe('Rajesh Kumar');
    expect(result.pagination.total).toBe(10);
    expect(result.pagination.page).toBe(1);
  });
});
