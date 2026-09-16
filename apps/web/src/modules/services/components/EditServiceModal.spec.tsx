import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '../../../providers/ToastProvider';
import { EditServiceModal } from './EditServiceModal';
import type { ServiceDetail } from '../services.api';

const mockMutateAsync = vi.fn();

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
  useUpdateServiceMutation: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

const mockService: ServiceDetail = {
  id: 'srv-100',
  serviceNumber: 'SRV-2026-0099',
  serviceType: 'PERIODIC_MAINTENANCE',
  serviceLocation: 'DOORSTEP',
  serviceClassification: 'GENERAL',
  scheduledDate: '2026-09-20T10:00:00.000Z',
  scheduledTimeSlot: '10:00 AM - 12:00 PM',
  status: 'SCHEDULED',
  priority: 'NORMAL',
  customerNotes: 'Initial customer note',
  internalNotes: 'Initial internal instruction',
  completedAt: null,
  createdAt: '2026-09-15T10:00:00.000Z',
  customerId: 'cust-1',
  customerName: 'Anil Kumar Sharma',
  customerPhone: '9123456780',
  customerNumber: 'CUST-2026-0001',
  customerEmail: 'anil@example.com',
  assetId: 'asset-1',
  assetNumber: 'AST-2026-0001',
  serialNumber: 'SN123456',
  productName: 'AquaPure Pro RO',
  productBrand: 'AquaPure',
  productSku: 'AP-RO-01',
  technicianId: 'tech-1',
  technicianName: 'Ramesh Patel',
  technicianPhone: '9898989898',
  warrantyId: null,
  warrantyStatus: null,
  warrantyEndDate: null,
  warrantyType: null,
  warrantyStartDate: null,
  jobCardId: 'jc-100',
  jobCardNumber: 'JC-2026-0099',
  jobCardStatus: 'SCHEDULED',
  jobCardCompletedAt: null,
  problemReported: 'Initial customer note',
  diagnosis: 'Sediment clogged',
  workPerformed: 'Filter cleaned',
  partsReplaced: null,
  technicianNotes: 'Good condition',
  customerRemarks: 'Satisfied',
  laborCharges: '250.00',
  partsCharges: '350.00',
  totalCharges: '600.00',
  updatedAt: '2026-09-15T10:00:00.000Z',
  cancelledAt: null,
  cancelReason: null,
};

describe('EditServiceModal', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const renderModal = (isOpen = true, service = mockService) =>
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <EditServiceModal isOpen={isOpen} onClose={vi.fn()} service={service} />
        </ToastProvider>
      </QueryClientProvider>
    );

  it('renders modal with title including service number and pre-populates fields', () => {
    renderModal();
    expect(screen.getByText(/Edit Service — SRV-2026-0099/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Initial customer note')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Initial internal instruction')).toBeInTheDocument();
    expect(screen.getByText('Save Service Changes')).toBeInTheDocument();
  });

  it('switches between Service Details and Job Card & Work Execution tabs', () => {
    renderModal();
    const executionTab = screen.getByText(/Job Card & Work Execution/i);
    fireEvent.click(executionTab);

    expect(screen.getByText('Technician Diagnosis')).toBeInTheDocument();
    expect(screen.getByText('Work Performed')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Sediment clogged')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Filter cleaned')).toBeInTheDocument();
  });

  it('submits updated service payload via useUpdateServiceMutation', async () => {
    mockMutateAsync.mockResolvedValueOnce({ success: true });
    renderModal();

    const saveBtn = screen.getByText('Save Service Changes');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'srv-100',
          data: expect.objectContaining({
            customerId: 'cust-1',
            serviceType: 'PERIODIC_MAINTENANCE',
            scheduledDate: '2026-09-20',
          }),
        })
      );
    });
  });
});
