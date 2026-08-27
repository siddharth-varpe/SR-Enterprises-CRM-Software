import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ServicesDirectory } from './ServicesDirectory';
import { ServiceSummaryCards } from './components/ServiceSummaryCards';
import { ToastProvider } from '../../providers/ToastProvider';

vi.mock('../../providers/AuthBoundary', () => ({
  useAuth: () => ({
    user: {
      userId: '1',
      username: 'admin',
      displayName: 'System Admin',
      role: 'Super Admin',
      permissions: ['services.view', 'services.create', 'services.update'],
    },
    hasPermission: () => true,
  }),
}));

vi.mock('./services.api', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    useServicesQuery: () => ({
      data: {
        data: [
          {
            id: 'srv-001',
            serviceNumber: 'SRV-2026-0001',
            serviceType: 'PERIODIC_MAINTENANCE',
            serviceLocation: 'DOORSTEP',
            serviceClassification: 'WARRANTY',
            scheduledDate: '2026-08-18T10:00:00Z',
            scheduledTimeSlot: '10:00 AM - 12:00 PM',
            status: 'SCHEDULED',
            priority: 'HIGH',
            customerNotes: 'Filter replacement request',
            internalNotes: 'Carry sediment filter',
            completedAt: null,
            createdAt: '2026-08-15T10:00:00Z',
            customerId: 'cust-001',
            customerName: 'Rajesh Kumar',
            customerPhone: '9826123456',
            customerNumber: 'CUST-2026-0001',
            assetId: 'asset-001',
            assetNumber: 'AST-2026-0001',
            serialNumber: 'AQ-PR-2026-889',
            productName: 'AquaPure Pro RO+UV 15L',
            productBrand: 'AquaPure',
            productSku: 'AP-RO-01',
            technicianId: 'tech-001',
            technicianName: 'Suresh Verma',
            technicianPhone: '9826011111',
            warrantyId: 'war-001',
            warrantyStatus: 'ACTIVE',
            warrantyEndDate: '2027-08-15T10:00:00Z',
            jobCardId: 'jc-001',
            jobCardNumber: 'JC-2026-0001',
            jobCardStatus: 'SCHEDULED',
          },
        ],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      },
      isLoading: false,
      isError: false,
    }),
    useServiceKPIsQuery: () => ({
      data: {
        totalServices: 42,
        upcomingServices: 18,
        warrantyServices: 24,
        generalServices: 18,
        completedServices: 24,
        dueToday: 4,
        overdueServices: 1,
      },
      isLoading: false,
    }),
    useServiceHeatmapQuery: () => ({
      data: {
        period: 'month',
        startDate: '2026-08-01T00:00:00Z',
        endDate: '2026-08-31T23:59:59Z',
        dailyData: [
          {
            date_str: '2026-08-18',
            count: 4,
            warranty_count: 3,
            general_count: 1,
            completed_count: 0,
            pending_count: 4,
            urgent_count: 1,
          },
        ],
      },
      isLoading: false,
    }),
    useTechniciansQuery: () => ({
      data: [
        { id: 'tech-001', name: 'Suresh Verma', phone: '9826011111', status: 'ACTIVE' },
      ],
      isLoading: false,
    }),
  };
});

describe('ServicesDirectory Component (Page 6)', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <BrowserRouter>
            <ServicesDirectory />
          </BrowserRouter>
        </ToastProvider>
      </QueryClientProvider>
    );

  it('renders page header and Add service / Schedule Service buttons', () => {
    renderComponent();
    expect(screen.getAllByText(/Services & Maintenance/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Add service')).toBeInTheDocument();
    expect(screen.getByText('Schedule Service')).toBeInTheDocument();
  });

  it('renders 5 operational KPI summary cards', () => {
    renderComponent();
    expect(screen.getByText('TOTAL SERVICES')).toBeInTheDocument();
    expect(screen.getByText('WARRANTY SERVICES')).toBeInTheDocument();
    expect(screen.getByText('GENERAL SERVICES')).toBeInTheDocument();
    expect(screen.getByText('ACTIONABLE / DUE')).toBeInTheDocument();
    expect(screen.getByText('COMPLETED VISITS')).toBeInTheDocument();
  });

  it('renders GitHub-style service schedule heatmap with intensity scale', () => {
    renderComponent();
    expect(screen.getByText('Service Schedule Heatmap')).toBeInTheDocument();
    expect(screen.getByText('Less')).toBeInTheDocument();
    expect(screen.getByText('More')).toBeInTheDocument();
  });

  it('renders service records in ServiceTable with customer and machine info', () => {
    renderComponent();
    expect(screen.getByText('SRV-2026-0001')).toBeInTheDocument();
    expect(screen.getByText('Rajesh Kumar')).toBeInTheDocument();
    expect(screen.getByText('9826123456')).toBeInTheDocument();
    expect(screen.getByText('AquaPure Pro RO+UV 15L')).toBeInTheDocument();
    expect(screen.getByText(/SN: AQ-PR-2026-889/i)).toBeInTheDocument();
    expect(screen.getByText('Warranty Free')).toBeInTheDocument();
    expect(screen.getByText('Suresh Verma')).toBeInTheDocument();
  });

  it('renders status tabs and location/classification filter dropdowns', () => {
    renderComponent();
    expect(screen.getByText('All Services')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search by SRV #, customer, phone, serial #, or technician/i)).toBeInTheDocument();
  });

  it('renders flat baseline graph when all service metrics are 0', () => {
    const { container } = render(
      <ServiceSummaryCards
        kpis={{
          totalServices: 0,
          upcomingServices: 0,
          warrantyServices: 0,
          generalServices: 0,
          completedServices: 0,
          dueToday: 0,
          overdueServices: 0,
        }}
        services={[]}
      />
    );
    const zeroElements = screen.getAllByText('0');
    expect(zeroElements.length).toBeGreaterThanOrEqual(5);
    // Ensure 5 SVGs exist and render paths
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThanOrEqual(5);
  });
});
