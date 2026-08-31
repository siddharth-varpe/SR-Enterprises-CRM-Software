import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { PaymentsDirectory } from './PaymentsDirectory';
import { ToastProvider } from '../../providers/ToastProvider';

// Mock API calls
vi.mock('./payments.api', () => ({
  usePaymentKPIs: () => ({
    data: {
      totalCollected: 145000,
      todayCollected: 12500,
      totalInvoiced: 210000,
      totalOutstanding: 65000,
      completedPaymentsCount: 42,
      pendingPaymentsCount: 3,
      overdueInvoicesCount: 5,
    },
    isLoading: false,
  }),
  usePayments: () => ({
    data: {
      data: [
        {
          id: 'pay-1',
          paymentNumber: 'PAY-2026-0001',
          amount: '12500.00',
          paymentDate: '2026-08-18T10:00:00Z',
          paymentMethod: 'UPI',
          status: 'COMPLETED',
          referenceNumber: 'UPI/99882211',
          notes: 'Customer transferred via Google Pay',
          createdAt: '2026-08-18T10:00:00Z',
          updatedAt: '2026-08-18T10:00:00Z',
          invoiceId: 'inv-1',
          invoiceNumber: 'INV-2026-0001',
          invoiceTotal: '15000.00',
          invoiceStatus: 'PARTIALLY_PAID',
          dueDate: '2026-08-25T00:00:00Z',
          customerId: 'cust-1',
          customerName: 'Anil Sharma',
          customerPhone: '9826199887',
          customerNumber: 'CUST-2026-0001',
          receivedByName: 'Operator Staff',
        },
      ],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
    },
    isLoading: false,
  }),
  useRecordPayment: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useCancelPayment: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useRefundPayment: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('../invoices/invoices.api', () => ({
  useInvoices: () => ({
    data: {
      data: [],
      pagination: { total: 0 },
    },
    isLoading: false,
  }),
  useInvoiceQuery: () => ({
    data: null,
    isLoading: false,
  }),
}));

describe('PaymentsDirectory Component (Phase 8)', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <BrowserRouter>
            <PaymentsDirectory />
          </BrowserRouter>
        </ToastProvider>
      </QueryClientProvider>
    );

  it('renders page header and Record Payment button', () => {
    renderComponent();
    expect(screen.getByText(/Payments & Collections/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Record Payment/i).length).toBeGreaterThan(0);
  });

  it('renders financial KPI cards with formatted Indian Rupee amounts', () => {
    renderComponent();
    expect(screen.getByText(/Total Collections/i)).toBeInTheDocument();
    expect(screen.getByText('₹1,45,000.00')).toBeInTheDocument();
    expect(screen.getByText(/Today's Collection/i)).toBeInTheDocument();
    expect(screen.getAllByText('₹12,500.00').length).toBeGreaterThan(0);
    expect(screen.getByText(/Outstanding Dues/i)).toBeInTheDocument();
    expect(screen.getByText('₹65,000.00')).toBeInTheDocument();
    expect(screen.getByText(/Overdue Invoices/i)).toBeInTheDocument();
  });

  it('renders payment records in table with customer, invoice reference, and receipt button', () => {
    renderComponent();
    expect(screen.getByText('PAY-2026-0001')).toBeInTheDocument();
    expect(screen.getByText('Anil Sharma')).toBeInTheDocument();
    expect(screen.getByText('INV-2026-0001')).toBeInTheDocument();
    expect(screen.getAllByText('UPI').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Receipt').length).toBeGreaterThan(0);
  });

  it('renders pending tab button on payments toolbar', () => {
    renderComponent();
    expect(screen.getByRole('button', { name: /Pending/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /All Payments/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Completed/i })).toBeInTheDocument();
  });
});
