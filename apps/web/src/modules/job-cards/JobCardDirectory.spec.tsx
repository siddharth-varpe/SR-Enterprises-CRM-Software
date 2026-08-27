import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { JobCardDirectory } from './JobCardDirectory';
import { ToastProvider } from '../../providers/ToastProvider';

// Mock API calls
vi.mock('./job-cards.api', () => ({
  useJobCardKPIsQuery: () => ({
    data: {
      totalJobCards: 28,
      assignedCount: 8,
      inProgressCount: 6,
      onHoldCount: 2,
      completedCount: 12,
      cancelledCount: 0,
    },
    isLoading: false,
  }),
  useJobCardsQuery: () => ({
    data: {
      data: [
        {
          id: 'jc-1',
          jobCardNumber: 'JC-2026-0001',
          status: 'IN_PROGRESS',
          problemReported: 'Water flow rate dropped, membrane suspected choked',
          diagnosis: 'Sediment pre-filter blocked',
          workPerformed: 'Replaced sediment filter',
          partsReplaced: [{ partName: 'Sediment 10 Micron', quantity: 1, unitPrice: 350, totalPrice: 350, isWarrantyCovered: false }],
          laborCharges: '250.00',
          partsCharges: '350.00',
          totalCharges: '600.00',
          startedAt: '2026-08-18T10:00:00Z',
          completedAt: null,
          createdAt: '2026-08-18T09:00:00Z',
          updatedAt: '2026-08-18T10:00:00Z',
          serviceId: 'srv-1',
          serviceNumber: 'SRV-2026-0001',
          serviceType: 'REPAIR',
          serviceLocation: 'DOORSTEP',
          serviceClassification: 'GENERAL',
          scheduledDate: '2026-08-18T00:00:00Z',
          scheduledTimeSlot: '10:00 AM - 12:00 PM',
          priority: 'HIGH',
          customerId: 'cust-1',
          customerName: 'Rahul Verma',
          customerPhone: '9812345678',
          customerNumber: 'CUST-2026-0001',
          assetId: 'ast-1',
          assetNumber: 'AST-2026-0001',
          serialNumber: 'SR-RO-998822',
          productName: 'AquaGrand Plus RO System',
          productBrand: 'AquaGrand',
          productSku: 'AG-RO-01',
          technicianId: 'tech-1',
          technicianName: 'Suresh Kumar',
          technicianPhone: '9876543210',
          warrantyId: null,
          warrantyStatus: null,
          warrantyEndDate: null,
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
    isFetching: false,
    refetch: vi.fn(),
  }),
  useJobCardActionMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useCreateJobCardMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useAssignTechnicianMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useCompleteJobCardMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('../technicians/technicians.api', () => ({
  useTechniciansQuery: () => ({
    data: {
      data: [{ id: 'tech-1', fullName: 'Suresh Kumar', phone: '9876543210', status: 'ACTIVE', activeJobsCount: 2 }],
      pagination: { total: 1 },
    },
    isLoading: false,
  }),
}));

vi.mock('../services/services.api', () => ({
  useServicesQuery: () => ({
    data: {
      data: [],
    },
    isLoading: false,
  }),
}));

describe('JobCardDirectory Component (Phase 7)', () => {
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
            <JobCardDirectory />
          </BrowserRouter>
        </ToastProvider>
      </QueryClientProvider>
    );

  it('renders page header and New Job Card button', () => {
    renderComponent();
    expect(screen.getByText(/Job Cards & Field Operations/i)).toBeInTheDocument();
    expect(screen.getByText(/New Job Card/i)).toBeInTheDocument();
  });

  it('renders KPI operational cards with formatted counts', () => {
    renderComponent();
    expect(screen.getByText(/Total Job Cards/i)).toBeInTheDocument();
    expect(screen.getByText('28')).toBeInTheDocument();
    expect(screen.getByText(/In Progress & Active/i)).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText(/Completed & Closed/i)).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('renders job card records in table with customer, machine, and technician', () => {
    renderComponent();
    expect(screen.getByText('JC-2026-0001')).toBeInTheDocument();
    expect(screen.getByText('Rahul Verma')).toBeInTheDocument();
    expect(screen.getByText(/AquaGrand Plus RO System/i)).toBeInTheDocument();
    expect(screen.getAllByText('Suresh Kumar').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/In Progress/i).length).toBeGreaterThan(0);
  });
});
