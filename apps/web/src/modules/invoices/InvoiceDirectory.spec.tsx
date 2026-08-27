import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { InvoiceDirectory } from './InvoiceDirectory';

vi.mock('./invoices.api', () => ({
  useInvoicesQuery: () => ({
    data: {
      data: [
        {
          id: '33333333-3333-3333-3333-333333333333',
          invoiceNumber: 'INV-2026-0001',
          customerId: '22222222-2222-2222-2222-222222222222',
          customerName: 'Aarav Sharma',
          customerNumber: 'CUST-2026-0001',
          customerPhone: '+919876543210',
          invoiceDate: new Date('2026-03-01').toISOString(),
          dueDate: new Date('2026-03-16').toISOString(),
          subtotal: '18900.00',
          discountAmount: '0.00',
          taxAmount: '3402.00',
          totalAmount: '22302.00',
          paidAmount: '0.00',
          outstandingAmount: '22302.00',
          status: 'ISSUED',
        },
      ],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    },
    isLoading: false,
  }),
}));

describe('Phase 5 — Invoices Directory Component', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  it('renders invoices directory with page header, search input, and invoice rows', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <InvoiceDirectory />
        </BrowserRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText('Invoices & Billing')).toBeDefined();
    expect(screen.getByText('INV-2026-0001')).toBeDefined();
    expect(screen.getByText('Aarav Sharma')).toBeDefined();
    expect(screen.getAllByText('Not Paid').length).toBeGreaterThan(0);
  });
});
