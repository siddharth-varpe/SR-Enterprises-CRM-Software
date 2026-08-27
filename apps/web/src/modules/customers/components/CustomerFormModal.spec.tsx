import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CustomerFormModal } from './CustomerFormModal';
import { ToastProvider } from '../../../providers/ToastProvider';

vi.mock('../customer.api', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    useCreateCustomerMutation: () => ({
      mutateAsync: vi.fn(),
      isPending: false,
    }),
    useUpdateCustomerMutation: () => ({
      mutateAsync: vi.fn(),
      isPending: false,
    }),
    checkCustomerDuplicateApi: vi.fn().mockResolvedValue({
      isDuplicate: false,
      matchField: null,
      existingCustomer: null,
    }),
  };
});

describe('CustomerFormModal Component', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const renderModal = (isOpen = true, customer = null) =>
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <CustomerFormModal
            isOpen={isOpen}
            onClose={vi.fn()}
            customer={customer}
          />
        </ToastProvider>
      </QueryClientProvider>
    );

  it('renders creation form modal with required identity fields', () => {
    renderModal(true);
    expect(screen.getByText('Add New Customer')).toBeInTheDocument();
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Phone Number/i)).toBeInTheDocument();
    expect(screen.getByText('Create Customer')).toBeInTheDocument();
  });

  it('renders default service address fields', () => {
    renderModal(true);
    expect(screen.getByLabelText(/Address Line 1/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/City/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/State/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Pincode/i)).toBeInTheDocument();
  });

  it('renders edit mode properly when customer prop is provided', () => {
    const mockCustomer: any = {
      id: 'cust-123',
      customerNumber: 'CUST-2026-0001',
      fullName: 'Sunil Sharma',
      phone: '9826111222',
      email: 'sunil@example.com',
      customerType: 'INDIVIDUAL',
      addresses: [
        {
          id: 'addr-1',
          addressType: 'SERVICE',
          addressLine1: 'Flat 101, Galaxy Apts',
          city: 'Raipur',
          state: 'Chhattisgarh',
          postalCode: '492001',
          isDefault: true,
        },
      ],
    };

    renderModal(true, mockCustomer);
    expect(screen.getByText('Edit Customer: Sunil Sharma')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Sunil Sharma')).toBeInTheDocument();
    expect(screen.getByDisplayValue('9826111222')).toBeInTheDocument();
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
  });
});
