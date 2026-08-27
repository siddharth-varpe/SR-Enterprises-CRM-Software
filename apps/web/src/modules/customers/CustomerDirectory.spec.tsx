import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { CustomerDirectory } from './CustomerDirectory';
import { ToastProvider } from '../../providers/ToastProvider';

vi.mock('../../providers/AuthBoundary', () => ({
  useAuth: () => ({
    user: {
      userId: '1',
      username: 'admin',
      displayName: 'System Admin',
      role: 'Super Admin',
      permissions: ['customers.view', 'customers.create', 'customers.update', 'customers.archive'],
    },
    hasPermission: () => true,
  }),
}));

vi.mock('./customer.api', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    useCustomersQuery: () => ({
      data: {
        data: [
          {
            id: '11111111-1111-1111-1111-111111111111',
            customerNumber: 'CUST-2026-0001',
            fullName: 'Rajesh Kumar',
            phone: '9826123456',
            email: 'rajesh@example.com',
            customerType: 'INDIVIDUAL',
            status: 'ACTIVE',
            createdAt: '2026-01-10T10:00:00Z',
            updatedAt: '2026-01-10T10:00:00Z',
            addresses: [
              {
                id: 'addr-1',
                customerId: '11111111-1111-1111-1111-111111111111',
                addressType: 'SERVICE',
                addressLine1: 'Plot 42, Civil Lines',
                city: 'Raipur',
                state: 'Chhattisgarh',
                postalCode: '492001',
                isDefault: true,
              },
            ],
          },
        ],
        pagination: { page: 1, pageSize: 10, total: 1 },
      },
      isLoading: false,
      isError: false,
    }),
  };
});

describe('CustomerDirectory Component', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <BrowserRouter>
            <CustomerDirectory />
          </BrowserRouter>
        </ToastProvider>
      </QueryClientProvider>
    );

  it('renders page header and Add Customer action', () => {
    renderComponent();
    expect(screen.getAllByText('Customers').length).toBeGreaterThan(0);
    expect(screen.getByText('Add Customer')).toBeInTheDocument();
  });

  it('renders customer records in CustomerTable and Details Panel', () => {
    renderComponent();
    expect(screen.getAllByText('Rajesh Kumar').length).toBeGreaterThan(0);
    expect(screen.getAllByText('CUST-2026-0001').length).toBeGreaterThan(0);
    expect(screen.getAllByText('9826123456').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Raipur, Chhattisgarh').length).toBeGreaterThan(0);
  });

  it('renders search and filter controls', () => {
    renderComponent();
    expect(
      screen.getByPlaceholderText(/Search by name, mobile, email or customer ID/i)
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search customers, invoices, services/i)).toBeInTheDocument();
    expect(screen.getByText('TOTAL CUSTOMERS')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE CUSTOMERS')).toBeInTheDocument();
  });
});
