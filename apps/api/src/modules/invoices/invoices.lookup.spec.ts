import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db, closeDatabaseConnections, ensureDatabaseInitialized } from '../../database/client';
import { invoicesRepository } from './invoices.repository';
import { CustomerRepository } from '../customers/customer.repository';
import { SalesRepository } from '../sales/sales.repository';
import { randomUUID } from 'crypto';

describe('Invoices Repository Multi-Resolution Lookup Tests', () => {
  const customerRepo = new CustomerRepository();
  const salesRepo = new SalesRepository();
  let testCustomer: any;
  let testSale: any;

  beforeAll(async () => {
    await ensureDatabaseInitialized();
    testCustomer = await customerRepo.create(
      {
        fullName: 'Invoice Lookup Test Customer',
        phone: `98${String(Date.now()).slice(-8)}`,
        email: `invlookup.${Date.now()}@example.com`,
        customerType: 'INDIVIDUAL',
        addresses: [
          {
            addressType: 'SERVICE',
            addressLine1: 'Test Address Line 1',
            city: 'Pune',
            state: 'Maharashtra',
            postalCode: '411017',
            isDefault: true,
          },
        ],
      },
      'system'
    );

    testSale = await salesRepo.createSale(
      {
        customerId: testCustomer.id,
        saleType: 'DIRECT_SALE',
        paymentMethod: 'UPI',
        status: 'COMPLETED',
        notes: 'Test Sale for Invoice Lookup',
        items: [
          {
            itemType: 'PRODUCT',
            productName: 'SR Aqua RO Unit',
            quantity: 1,
            unitPrice: 12000,
            gstRate: 18,
          },
        ],
      },
      'system'
    );
  });

  afterAll(async () => {
    await closeDatabaseConnections();
  });

  it('1. Looks up invoice directly by invoice UUID', async () => {
    const invoiceId = testSale.invoice?.id;
    expect(invoiceId).toBeDefined();

    const inv = await invoicesRepository.findById(invoiceId);
    expect(inv).not.toBeNull();
    expect(inv?.id).toBe(invoiceId);
    expect(inv?.customerName).toBe('Invoice Lookup Test Customer');
    expect(inv?.items.length).toBeGreaterThanOrEqual(1);
  });

  it('2. Looks up invoice by invoiceNumber (e.g. INV-...)', async () => {
    const invNumber = testSale.invoice?.invoiceNumber;
    expect(invNumber).toBeDefined();

    const inv = await invoicesRepository.findById(invNumber);
    expect(inv).not.toBeNull();
    expect(inv?.invoiceNumber).toBe(invNumber);
  });

  it('3. Looks up invoice by linked saleId', async () => {
    const saleId = testSale.id;
    expect(saleId).toBeDefined();

    const inv = await invoicesRepository.findById(saleId);
    expect(inv).not.toBeNull();
    expect(inv?.saleId).toBe(saleId);
    expect(inv?.customerName).toBe('Invoice Lookup Test Customer');
  });

  it('4. Resolves invoice for sale when queried via saleId even if direct invoice query used saleId', async () => {
    // Lookup with sale UUID
    const inv = await invoicesRepository.findById(testSale.id);
    expect(inv).not.toBeNull();
    expect(inv?.totalAmount).toBe(testSale.totalAmount);
  });
});
