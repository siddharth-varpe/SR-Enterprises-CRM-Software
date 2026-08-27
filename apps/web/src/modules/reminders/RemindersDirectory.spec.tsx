import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { RemindersDirectory } from './RemindersDirectory';
import { ToastProvider } from '../../providers/ToastProvider';

// Mock API calls
vi.mock('./reminders.api', () => ({
  useReminderKPIs: () => ({
    data: {
      totalReminders: 15,
      pendingCount: 8,
      dueTodayCount: 3,
      overdueCount: 2,
      completedCount: 5,
    },
    isLoading: false,
  }),
  useReminders: () => ({
    data: {
      data: [
        {
          id: 'rem-1',
          reminderNumber: 'REM-2026-0001',
          reminderType: 'PAYMENT_FOLLOW_UP',
          reminderDate: '2026-08-18T00:00:00Z',
          reminderTime: '11:00 AM',
          priority: 'HIGH',
          status: 'PENDING',
          notes: 'Call customer regarding balance payment of ₹2,500',
          completedAt: null,
          createdAt: '2026-08-18T00:00:00Z',
          updatedAt: '2026-08-18T00:00:00Z',
          customerId: 'cust-1',
          customerName: 'Pooja Agarwal',
          customerPhone: '9826188990',
          customerNumber: 'CUST-2026-0001',
          invoiceId: 'inv-1',
          invoiceNumber: 'INV-2026-0001',
          invoiceTotal: '12500.00',
          invoiceStatus: 'PARTIALLY_PAID',
          dueDate: '2026-08-20T00:00:00Z',
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
  useCreateReminder: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useCompleteReminder: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useCancelReminder: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('../customers/customer.api', () => ({
  useCustomersQuery: () => ({
    data: {
      data: [],
      pagination: { total: 0 },
    },
    isLoading: false,
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
}));

describe('RemindersDirectory Component (Phase 8)', () => {
  afterEach(() => {
    cleanup();
  });

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
            <RemindersDirectory />
          </BrowserRouter>
        </ToastProvider>
      </QueryClientProvider>
    );

  it('renders page header and New Reminder button', () => {
    renderComponent();
    expect(screen.getByText(/Follow-up Reminders/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /New Reminder/i })[0]).toBeInTheDocument();
  });

  it('renders reminder KPI cards', () => {
    renderComponent();
    expect(screen.getByText(/Total Follow-ups/i)).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText(/Pending Reminders/i)).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText(/Due Today/i)).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders reminder records with customer, invoice reference, and complete button', () => {
    renderComponent();
    expect(screen.getByText('REM-2026-0001')).toBeInTheDocument();
    expect(screen.getByText('Pooja Agarwal')).toBeInTheDocument();
    expect(screen.getByText('INV-2026-0001')).toBeInTheDocument();
    expect(screen.getAllByText(/Payment Follow-up/i)[0]).toBeInTheDocument();
    expect(screen.getByText('Complete')).toBeInTheDocument();
  });
});
