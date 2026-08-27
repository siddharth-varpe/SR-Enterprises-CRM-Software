import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { CustomerProfile } from './CustomerProfile';
import { ToastProvider } from '../../providers/ToastProvider';

vi.mock('../../providers/AuthBoundary', () => ({
  useAuth: () => ({
    user: {
      userId: '1',
      username: 'admin',
      displayName: 'System Admin',
      role: 'Super Admin',
      permissions: [
        'customers.view',
        'customers.create',
        'customers.update',
        'customers.archive',
        'invoices.view',
        'payments.view',
      ],
    },
    hasPermission: () => true,
  }),
}));

vi.mock('./customer.api', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    useCustomerDetailQuery: () => ({
      data: {
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
        notes: 'Preferred visit timing: After 4 PM',
      },
      isLoading: false,
      isError: false,
    }),
    useCustomerFinancialSummaryQuery: () => ({
      data: {
        customerId: '11111111-1111-1111-1111-111111111111',
        totalBilled: '32000.00',
        totalPaid: '22000.00',
        outstanding: '10000.00',
        overdue: '0.00',
        paymentHealth: 'PARTIALLY_PAID',
        lastPaymentDate: '2026-02-15T10:00:00Z',
        lastPaymentAmount: '5000.00',
        lastPaymentMethod: 'UPI',
      },
      isLoading: false,
      isError: false,
    }),
    useCustomerAssetsQuery: () => ({
      data: [
        {
          id: 'asset-1',
          assetType: 'RO_MACHINE',
          serialNumber: 'RO-2026-X800',
          purchaseDate: '2026-01-15T00:00:00Z',
          status: 'ACTIVE',
          product: { name: 'AquaFlow Pro 15L RO+UV', sku: 'AF-PRO-15', brand: 'AquaFlow' },
          warranties: [
            {
              id: 'warr-1',
              status: 'ACTIVE',
              startDate: '2026-01-15T00:00:00Z',
              endDate: '2027-01-15T00:00:00Z',
              warrantyType: 'STANDARD_MACHINE',
            },
          ],
        },
      ],
      isLoading: false,
      isError: false,
    }),
    useCustomerActivitiesQuery: () => ({
      data: {
        data: [
          {
            id: 'act-1',
            eventType: 'CUSTOMER_CREATED',
            entityType: 'CUSTOMER',
            entityId: '11111111-1111-1111-1111-111111111111',
            description: 'Customer account created (CUST-2026-0001)',
            actorName: 'System Admin',
            timestamp: '2026-01-10T10:00:00Z',
          },
        ],
        pagination: { page: 1, pageSize: 50, total: 1 },
      },
      isLoading: false,
      isError: false,
    }),
    useAddCustomerNoteMutation: () => ({
      mutateAsync: vi.fn(),
      isPending: false,
    }),
  };
});

describe('CustomerProfile Component', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <MemoryRouter initialEntries={['/customers/11111111-1111-1111-1111-111111111111']}>
            <Routes>
              <Route path="/customers/:id" element={<CustomerProfile />} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>
    );

  it('renders customer profile header with name, ID badge, and contact links', () => {
    renderComponent();
    expect(screen.getAllByText('Rajesh Kumar').length).toBeGreaterThan(0);
    expect(screen.getAllByText('CUST-2026-0001').length).toBeGreaterThan(0);
    expect(screen.getByText('9826123456')).toBeInTheDocument();
    expect(screen.getByText('rajesh@example.com')).toBeInTheDocument();
  });

  it('renders authoritative financial summary panel on right side', () => {
    renderComponent();
    expect(screen.getByText('Financial Position')).toBeInTheDocument();
    expect(screen.getByText('₹10,000.00')).toBeInTheDocument();
    expect(screen.getByText('₹32,000.00')).toBeInTheDocument();
    expect(screen.getByText('₹22,000.00')).toBeInTheDocument();
  });

  it('renders overview tab with addresses, customer notes, dynamic Payment Trend, Delete Customer button, and removes Top Services card', () => {
    renderComponent();
    expect(screen.getAllByText('Registered Locations & Addresses').length).toBeGreaterThan(0);
    expect(screen.getByText(/Plot 42, Civil Lines/i)).toBeInTheDocument();
    expect(screen.getByText(/Preferred visit timing: After 4 PM/i)).toBeInTheDocument();
    expect(screen.getByText('Payment Trend')).toBeInTheDocument();
    expect(screen.getByText('Delete Customer')).toBeInTheDocument();
    expect(screen.queryByText('Top Services by Spend')).not.toBeInTheDocument();
  });
});
