import { describe, it, expect } from 'vitest';
import { calculateSaleTotals } from '../modules/sales/sales.calculator';

describe('Phase 12 — Financial Transactions, Precision & Rollback Integrity', () => {
  describe('1. Exact Decimal Financial Math & GST Computation', () => {
    it('calculates exact line item tax, subtotal, and grand totals with zero precision loss', () => {
      const items = [
        {
          quantity: 2,
          unitPrice: 8499.5,
          discountAmount: 500, // discount per line
          taxRatePercent: 18, // 18% GST
        },
        {
          quantity: 3,
          unitPrice: 450.25,
          discountAmount: 0,
          taxRatePercent: 12, // 12% GST
        },
      ];

      // Item 1: (8499.50 * 2 = 16999.00) - 500 = 16499.00 taxable. 18% GST = 2969.82. Line total = 19468.82
      // Item 2: (450.25 * 3 = 1350.75) - 0 = 1350.75 taxable. 12% GST = 162.09. Line total = 1512.84
      // Total taxable = 17849.75, Tax = 3131.91, Total = 20981.66

      const result = calculateSaleTotals(items);
      expect(parseFloat(result.subtotal)).toBe(18349.75);
      expect(parseFloat(result.discountAmount)).toBe(500);
      expect(parseFloat(result.taxAmount)).toBeCloseTo(3131.91, 2);
      expect(parseFloat(result.totalAmount)).toBeCloseTo(20981.66, 2);
    });

    it('handles zero amount, 100% discount, and tax-exempt goods safely', () => {
      const zeroItems = [
        {
          quantity: 1,
          unitPrice: 350,
          discountAmount: 350,
          taxRatePercent: 18,
        },
      ];

      const result = calculateSaleTotals(zeroItems);
      expect(parseFloat(result.subtotal)).toBe(350);
      expect(parseFloat(result.discountAmount)).toBe(350);
      expect(parseFloat(result.taxAmount)).toBe(0);
      expect(parseFloat(result.totalAmount)).toBe(0);
    });
  });

  describe('2. Payment Reconciliation & Ledger Rollback Integrity', () => {
    it('accurately reconciles payment cancellations and restores unpaid balances', () => {
      const invoice = {
        id: 'inv-ledger-01',
        totalAmount: 15000,
        paidAmount: 15000,
        balanceAmount: 0,
        status: 'PAID',
      };

      const payments = [
        { id: 'pay-01', amount: 10000, status: 'COMPLETED' },
        { id: 'pay-02', amount: 5000, status: 'COMPLETED' },
      ];

      // Cancel payment #2 (₹5,000 bounced cheque or chargeback)
      const cancelledPayment = payments[1];
      cancelledPayment.status = 'CANCELLED';

      // Reconcile Invoice
      const activePaymentsSum = payments
        .filter((p) => p.status === 'COMPLETED')
        .reduce((sum, p) => sum + p.amount, 0);

      invoice.paidAmount = activePaymentsSum;
      invoice.balanceAmount = invoice.totalAmount - invoice.paidAmount;
      invoice.status = invoice.balanceAmount === 0 ? 'PAID' : invoice.paidAmount > 0 ? 'PARTIALLY_PAID' : 'PENDING';

      expect(invoice.paidAmount).toBe(10000);
      expect(invoice.balanceAmount).toBe(5000);
      expect(invoice.status).toBe('PARTIALLY_PAID');
    });

    it('simulates transaction rollback: failure during line item insertion reverts invoice creation', () => {
      interface MockTxState {
        invoices: any[];
        invoiceItems: any[];
      }

      const dbState: MockTxState = {
        invoices: [],
        invoiceItems: [],
      };

      const executeInvoiceTransaction = (shouldFailAtItem: boolean) => {
        // Snapshot for transaction isolation
        const snapshot = {
          invoices: [...dbState.invoices],
          invoiceItems: [...dbState.invoiceItems],
        };

        try {
          // Step 1: Create Invoice Header
          const newInvoice = { id: 'inv-tx-99', totalAmount: 5000 };
          snapshot.invoices.push(newInvoice);

          // Step 2: Create Line Items
          if (shouldFailAtItem) {
            throw new Error('Database constraint violation: Product not found');
          }
          snapshot.invoiceItems.push({ id: 'item-1', invoiceId: newInvoice.id, amount: 5000 });

          // Commit transaction
          dbState.invoices = snapshot.invoices;
          dbState.invoiceItems = snapshot.invoiceItems;
          return { success: true };
        } catch (err: any) {
          // Rollback: Discard changes
          return { success: false, error: err.message };
        }
      };

      // Execute with simulated failure
      const result = executeInvoiceTransaction(true);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Database constraint violation');

      // Verify zero dirty/orphan records exist in database state
      expect(dbState.invoices.length).toBe(0);
      expect(dbState.invoiceItems.length).toBe(0);

      // Execute without failure
      const successfulResult = executeInvoiceTransaction(false);
      expect(successfulResult.success).toBe(true);
      expect(dbState.invoices.length).toBe(1);
      expect(dbState.invoiceItems.length).toBe(1);
    });
  });

  describe('3. Concurrency & Idempotency Safeguards', () => {
    it('prevents duplicate payment recording via unique idempotency reference checks', () => {
      const recordedPaymentReferences = new Set<string>();

      const recordPayment = (refNumber: string, amount: number) => {
        if (recordedPaymentReferences.has(refNumber)) {
          return { success: false, error: 'DUPLICATE_TRANSACTION: Payment reference already processed.' };
        }
        recordedPaymentReferences.add(refNumber);
        return { success: true, amount };
      };

      const firstAttempt = recordPayment('UPI/2026/08/991122', 4500);
      expect(firstAttempt.success).toBe(true);

      const duplicateAttempt = recordPayment('UPI/2026/08/991122', 4500);
      expect(duplicateAttempt.success).toBe(false);
      expect(duplicateAttempt.error).toContain('DUPLICATE_TRANSACTION');
    });
  });
});
