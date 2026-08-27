import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { WarrantyDirectory } from './WarrantyDirectory';
import { ToastProvider } from '../../providers/ToastProvider';

// Mock API calls
vi.mock('./warranties.api', () => ({
  useWarrantyKPIsQuery: () => ({
    data: {
      totalWarranties: 42,
      activeWarranties: 35,
      expiringSoon: 5,
      expiredWarranties: 2,
      voidWarranties: 0,
    },
    isLoading: false,
  }),
  useWarrantiesQuery: () => ({
    data: {
      data: [
        {
          id: 'war-1',
          warrantyNumber: 'WAR-2026-0001',
          warrantyType: 'STANDARD_MACHINE',
          startDate: '2026-01-01T00:00:00Z',
          endDate: '2027-01-01T00:00:00Z',
          durationMonths: 12,
          status: 'ACTIVE',
          customerId: 'cust-1',
          customerName: 'Aarav Sharma',
          customerPhone: '9876543210',
          customerNumber: 'CUST-2026-0001',
          assetId: 'asset-1',
          assetNumber: 'AST-2026-0001',
          serialNumber: 'SR-RO-998822',
          productName: 'AquaGrand Plus RO System',
          productBrand: 'AquaGrand',
          productSku: 'AG-RO-01',
          saleId: null,
          saleNumber: null,
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
  useCreateWarrantyMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useUpdateWarrantyMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('../customers/customer.api', () => ({
  useCustomersQuery: () => ({
    data: {
      data: [{ id: 'cust-1', fullName: 'Aarav Sharma', phone: '9876543210', customerNumber: 'CUST-001' }],
      pagination: { total: 1 },
    },
    isLoading: false,
  }),
  useCustomerAssetsQuery: () => ({
    data: [{ id: 'asset-1', serialNumber: 'SR-RO-998822', product: { name: 'AquaGrand Plus RO' } }],
    isLoading: false,
  }),
}));

describe('WarrantyDirectory Component (Phase 6)', () => {
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
            <WarrantyDirectory />
          </BrowserRouter>
        </ToastProvider>
      </QueryClientProvider>
    );

  it('renders page header and Register Warranty button', () => {
    renderComponent();
    expect(screen.getByText(/Warranty & AMC Management/i)).toBeInTheDocument();
    expect(screen.getByText(/Register Warranty/i)).toBeInTheDocument();
  });

  it('renders KPI operational cards with formatted counts', () => {
    renderComponent();
    expect(screen.getByText(/Total Warranties/i)).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getAllByText(/Active Coverage/i).length).toBeGreaterThan(0);
    expect(screen.getByText('35')).toBeInTheDocument();
  });

  it('renders warranty records in table', () => {
    renderComponent();
    expect(screen.getByText('WAR-2026-0001')).toBeInTheDocument();
    expect(screen.getByText('Aarav Sharma')).toBeInTheDocument();
    expect(screen.getByText(/AquaGrand Plus RO System/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Active Coverage/i).length).toBeGreaterThan(0);
  });
});
