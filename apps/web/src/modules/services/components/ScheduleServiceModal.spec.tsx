import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ScheduleServiceModal } from './ScheduleServiceModal';

vi.mock('../../customers/customer.api', () => ({
  useCustomersQuery: () => ({
    data: {
      data: [
        {
          id: 'cust-1',
          fullName: 'Anil Kumar Sharma',
          phone: '9123456780',
          customerNumber: 'CUST-2026-0001',
          companyName: 'Sharma RO Solutions',
          createdAt: '2026-08-20T10:00:00Z',
        },
        {
          id: 'cust-2',
          fullName: 'Sunil Verma',
          phone: '9876543210',
          customerNumber: 'CUST-2026-0002',
          companyName: 'Verma Enterprises',
          createdAt: '2026-08-21T10:00:00Z',
        },
      ],
    },
  }),
  useCustomerDetailQuery: () => ({
    data: {
      id: 'cust-1',
      assets: [
        {
          id: 'asset-1',
          assetNumber: 'AST-2026-0001',
          serialNumber: 'SN123456',
          product: { name: 'AquaPure Pro RO', brand: 'AquaPure', sku: 'AP-RO-01' },
        },
      ],
    },
  }),
}));

vi.mock('../../assets/assets.api', () => ({
  useAssetsQuery: () => ({
    data: {
      data: [
        {
          id: 'asset-1',
          assetNumber: 'AST-2026-0001',
          productName: 'AquaPure Pro RO',
          serialNumber: 'SN123456',
        },
      ],
    },
    isLoading: false,
  }),
}));

vi.mock('../services.api', () => ({
  useTechniciansQuery: () => ({
    data: [{ id: 'tech-1', name: 'Ramesh Patel', phone: '9898989898' }],
  }),
  useCreateServiceMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

describe('ScheduleServiceModal Customer Search Bar', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  it('renders customer search bar and filters customer dropdown options in real-time', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ScheduleServiceModal isOpen={true} onClose={() => {}} />
      </QueryClientProvider>
    );

    // Verify search bar input is rendered
    const searchInput = screen.getByPlaceholderText(/Search customer by name, phone number, customer #, or company/i);
    expect(searchInput).toBeInTheDocument();

    // Verify both customers are available in dropdown initially
    expect(screen.getByText(/Anil Kumar Sharma/i)).toBeInTheDocument();
    expect(screen.getByText(/Sunil Verma/i)).toBeInTheDocument();

    // Type in search bar to filter by name
    fireEvent.change(searchInput, { target: { value: 'Sunil' } });

    // Verify matching count indicator is displayed
    expect(screen.getByText(/1 matching customer\(s\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Sunil Verma/i)).toBeInTheDocument();
    expect(screen.queryByText(/Anil Kumar Sharma/i)).not.toBeInTheDocument();

    // Clear search using clear button
    const clearButton = screen.getByTitle('Clear search');
    fireEvent.click(clearButton);

    // Both customers should be visible again
    expect(screen.getByText(/Anil Kumar Sharma/i)).toBeInTheDocument();
    expect(screen.getByText(/Sunil Verma/i)).toBeInTheDocument();
  });
});
