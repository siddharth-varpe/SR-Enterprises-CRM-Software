import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { InvoiceDetailPage } from './InvoiceDetailPage';
import * as invoiceApi from './invoices.api';
import { OFFICIAL_LOWER_SECTION_B64, SR_ENTERPRISES_LOGO_B64 } from '../../assets/invoiceAssets';

import { ToastProvider } from '../../providers/ToastProvider';

vi.mock('../../providers/AuthBoundary', () => ({
  useAuth: () => ({
    hasPermission: () => true,
    user: { id: 'test-user', fullName: 'Staff Member' },
  }),
}));

vi.mock('../payments/payments.api', () => ({
  useInvoicePayments: () => ({
    data: [],
    isLoading: false,
  }),
  useRecordPayment: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

describe('Invoice Template Variations Verification (Section 11 Tests A-G)', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const renderWithInvoiceData = (invoiceData: any) => {
    vi.spyOn(invoiceApi, 'useInvoiceQuery').mockReturnValue({
      data: invoiceData,
      isLoading: false,
    } as any);

    vi.spyOn(invoiceApi, 'useCancelInvoiceMutation').mockReturnValue({
      mutateAsync: vi.fn(),
    } as any);

    return render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <BrowserRouter>
            <InvoiceDetailPage />
          </BrowserRouter>
        </ToastProvider>
      </QueryClientProvider>
    );
  };

  it('TEST A: Normal full-payment sale (Received = Total, Balance = 0)', () => {
    renderWithInvoiceData({
      id: 'inv-a',
      invoiceNumber: '82026209',
      customerName: 'Prabhati Foods Private Limited',
      customerPhone: '9989155841',
      invoiceDate: '2026-08-23T00:00:00.000Z',
      dueDate: '2026-08-30T00:00:00.000Z',
      subtotal: '20150.00',
      discountAmount: '5100.00',
      taxAmount: '0.00',
      totalAmount: '15050.00',
      paidAmount: '15050.00',
      outstandingAmount: '0.00',
      status: 'PAID',
      notes: '1 Years Warranty On Ele Spears 1 Service Free',
      items: [
        { nameSnapshot: '25LPH Ro Plant With 18L Tank', quantity: 1, unitPriceSnapshot: '18500', lineTotal: '18500' },
        { nameSnapshot: 'PRV', quantity: 1, unitPriceSnapshot: '700', lineTotal: '700' },
        { nameSnapshot: 'Prefilter Bowl Housing', quantity: 1, unitPriceSnapshot: '650', lineTotal: '650' },
        { nameSnapshot: 'SF PreFilter', quantity: 2, unitPriceSnapshot: '150', lineTotal: '300' },
      ],
    });

    expect(screen.getByText('PRABHATI FOODS PRIVATE LIMITED')).toBeDefined();
    expect(screen.getByText('Received Amount:')).toBeDefined();
    expect(screen.getByText('Balance Amount:')).toBeDefined();
    expect(screen.getAllByText('₹ 15,050').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('₹ 0')).toBeDefined();

    // Verify static lower section image
    const lowerImg = screen.getByAltText('Official SR Enterprises Bank, QR, Terms & Signatory') as HTMLImageElement;
    expect(lowerImg).toBeDefined();
    expect(lowerImg.src).toBe(OFFICIAL_LOWER_SECTION_B64);
  });

  it('TEST B: Partial-payment sale (Received = 6950, Balance = 8100)', () => {
    renderWithInvoiceData({
      id: 'inv-b',
      invoiceNumber: '82026209',
      customerName: 'Prabhati Foods Private Limited',
      customerPhone: '9989155841',
      invoiceDate: '2026-08-23T00:00:00.000Z',
      dueDate: '2026-08-30T00:00:00.000Z',
      subtotal: '20150.00',
      discountAmount: '5100.00',
      taxAmount: '0.00',
      totalAmount: '15050.00',
      paidAmount: '6950.00',
      outstandingAmount: '8100.00',
      status: 'PARTIALLY_PAID',
      notes: '1 Years Warranty On Ele Spears 1 Service Free',
      items: [
        { nameSnapshot: '25LPH Ro Plant With 18L Tank', quantity: 1, unitPriceSnapshot: '18500', lineTotal: '18500' },
      ],
    });

    expect(screen.getByText('₹ 6,950')).toBeDefined();
    expect(screen.getByText('₹ 8,100')).toBeDefined();
  });

  it('TEST C: No-payment sale (Received = 0, Balance = Total)', () => {
    renderWithInvoiceData({
      id: 'inv-c',
      invoiceNumber: '82026210',
      customerName: 'Aarav Traders',
      customerPhone: '9822112233',
      invoiceDate: '2026-08-24T00:00:00.000Z',
      dueDate: '2026-08-31T00:00:00.000Z',
      subtotal: '8500.00',
      discountAmount: '0.00',
      taxAmount: '0.00',
      totalAmount: '8500.00',
      paidAmount: '0.00',
      outstandingAmount: '8500.00',
      status: 'ISSUED',
      items: [
        { nameSnapshot: 'SR Pure Pro RO', quantity: 1, unitPriceSnapshot: '8500', lineTotal: '8500' },
      ],
    });

    expect(screen.getByText('AARAV TRADERS')).toBeDefined();
    expect(screen.getByText('₹ 0')).toBeDefined();
    expect(screen.getAllByText('₹ 8,500').length).toBeGreaterThanOrEqual(1);
  });

  it('TEST D: Multiple line items with discounts', () => {
    renderWithInvoiceData({
      id: 'inv-d',
      invoiceNumber: '82026211',
      customerName: 'Multi Item Customer',
      customerPhone: '9876543210',
      invoiceDate: '2026-08-25T00:00:00.000Z',
      dueDate: '2026-09-01T00:00:00.000Z',
      subtotal: '50000.00',
      discountAmount: '2000.00',
      taxAmount: '0.00',
      totalAmount: '48000.00',
      paidAmount: '48000.00',
      outstandingAmount: '0.00',
      status: 'PAID',
      items: [
        { nameSnapshot: 'Item 1 - Booster Pump 100 GPD', quantity: 2, unitPriceSnapshot: '1500', lineTotal: '3000' },
        { nameSnapshot: 'Item 2 - Membrane 75 GPD Vontron', quantity: 3, unitPriceSnapshot: '1200', lineTotal: '3600' },
        { nameSnapshot: 'Item 3 - RO Filter Candle Set', quantity: 5, unitPriceSnapshot: '300', lineTotal: '1500' },
      ],
    });

    expect(screen.getByText('Item 1 - Booster Pump 100 GPD')).toBeDefined();
    expect(screen.getByText('Item 2 - Membrane 75 GPD Vontron')).toBeDefined();
    expect(screen.getByText('Item 3 - RO Filter Candle Set')).toBeDefined();
    expect(screen.getByText('- ₹ 2,000')).toBeDefined();
  });

  it('TEST E: Long customer name & long product descriptions', () => {
    const longName = 'SHREE SWAMI SAMARTH INDUSTRIAL CHEMICALS AND WATER TREATMENT SOLUTIONS PRIVATE LIMITED';
    const longItem = 'Industrial Multi-Stage High Capacity Reverse Osmosis Water Purification Filtration System With Pre-Treatment Sand Filter & Carbon Filter Assembly';

    renderWithInvoiceData({
      id: 'inv-e',
      invoiceNumber: '82026212',
      customerName: longName,
      customerPhone: '9822334455',
      invoiceDate: '2026-08-26T00:00:00.000Z',
      dueDate: '2026-09-02T00:00:00.000Z',
      subtotal: '125000.00',
      discountAmount: '5000.00',
      taxAmount: '0.00',
      totalAmount: '120000.00',
      paidAmount: '60000.00',
      outstandingAmount: '60000.00',
      status: 'PARTIALLY_PAID',
      items: [
        { nameSnapshot: longItem, quantity: 1, unitPriceSnapshot: '125000', lineTotal: '125000' },
      ],
    });

    expect(screen.getByText(longName)).toBeDefined();
    expect(screen.getByText(longItem)).toBeDefined();
    expect(screen.getAllByText('₹ 60,000').length).toBeGreaterThanOrEqual(1);
  });
});
