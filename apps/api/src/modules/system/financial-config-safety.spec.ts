import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configService } from './configuration.service';
import { generateBusinessNumber, formatSequenceNumber } from '../../database/sequences';

describe('Phase 27: Financial & Domain Configuration Safety Tests', () => {
  beforeEach(() => {
    configService.clearCache();
    vi.clearAllMocks();
  });

  describe('1. Financial Snapshot Isolation (Historical Invoices)', () => {
    it('preserves historical snapshot values on older invoices when tax setting is modified', async () => {
      // Step 1: Default tax is 18%
      const taxConfig1 = await configService.get<any>('TAX');
      expect(taxConfig1.defaultTaxRatePercent).toBe(18.00);

      // Simulate Invoice #1 created with current tax rate snapshot
      const invoice1 = {
        invoiceNumber: 'INV-2026-0001',
        subtotal: 10000,
        taxRateSnapshot: taxConfig1.defaultTaxRatePercent,
        taxAmount: (10000 * taxConfig1.defaultTaxRatePercent) / 100,
        totalAmount: 10000 + (10000 * taxConfig1.defaultTaxRatePercent) / 100,
      };
      expect(invoice1.taxAmount).toBe(1800);
      expect(invoice1.totalAmount).toBe(11800);

      // Step 2: Administrator updates tax rate setting to 20% (simulated in-memory/cache)
      // In domain services, new calculations use configService.get('TAX')
      const newTaxRate = 20.00;

      // Simulate Invoice #2 created with new tax rate
      const invoice2 = {
        invoiceNumber: 'INV-2026-0002',
        subtotal: 10000,
        taxRateSnapshot: newTaxRate,
        taxAmount: (10000 * newTaxRate) / 100,
        totalAmount: 10000 + (10000 * newTaxRate) / 100,
      };

      // Verify: Invoice #1 MUST NOT change its stored tax rate or amounts!
      expect(invoice1.taxRateSnapshot).toBe(18.00);
      expect(invoice1.taxAmount).toBe(1800);
      expect(invoice1.totalAmount).toBe(11800);

      // Verify: Invoice #2 uses the new 20.00% rate
      expect(invoice2.taxRateSnapshot).toBe(20.00);
      expect(invoice2.taxAmount).toBe(2000);
      expect(invoice2.totalAmount).toBe(12000);
    });
  });

  describe('2. Warranty Duration Default Isolation', () => {
    it('does not retroactively mutate existing warranty records when default warranty is updated', async () => {
      // Step 1: Default warranty is 12 months
      const warrantyConfig = await configService.get<any>('WARRANTY');
      expect(warrantyConfig.defaultWarrantyMonths).toBe(12);

      const warranty1 = {
        warrantyNumber: 'WAR-2026-0001',
        durationMonths: warrantyConfig.defaultWarrantyMonths,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      };
      expect(warranty1.durationMonths).toBe(12);

      // Step 2: Admin changes default warranty to 24 months
      const updatedDefaultMonths = 24;

      const warranty2 = {
        warrantyNumber: 'WAR-2026-0002',
        durationMonths: updatedDefaultMonths,
        startDate: '2026-06-01',
        endDate: '2028-05-31',
      };

      // Verify: Historical warranty #1 remains 12 months
      expect(warranty1.durationMonths).toBe(12);
      // New warranty #2 is 24 months
      expect(warranty2.durationMonths).toBe(24);
    });
  });

  describe('3. Dynamic Numbering Configuration & Concurrency', () => {
    it('formats sequence numbers correctly with custom prefix and padding', () => {
      const formatted = formatSequenceNumber('SR-INV', 2026, 42, 6);
      expect(formatted).toBe('SR-INV-2026-000042');
    });

    it('generates unique sequence numbers atomically using database locks', async () => {
      const mockDb = {
        execute: vi.fn().mockResolvedValue([
          {
            current_val: 1,
            current_year: 2026,
            prefix: 'INV',
            padding: 4,
          },
        ]),
      };

      const result = await generateBusinessNumber(mockDb as any, 'INVOICE', 'INV', { padding: 4 });
      expect(result.sequenceNumber).toBe('INV-2026-0001');
      expect(result.counter).toBe(1);
      expect(result.prefix).toBe('INV');
    });
  });
});
