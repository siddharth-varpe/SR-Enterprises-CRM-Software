import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { TechniciansDirectory } from './TechniciansDirectory';
import { ToastProvider } from '../../providers/ToastProvider';

// Mock API calls
vi.mock('./technicians.api', () => ({
  useTechnicianKPIsQuery: () => ({
    data: {
      totalTechnicians: 14,
      activeTechnicians: 11,
      onLeave: 2,
      inactiveTechnicians: 1,
    },
    isLoading: false,
  }),
  useTechniciansQuery: () => ({
    data: {
      data: [
        {
          id: 'tech-1',
          fullName: 'Suresh Kumar',
          phone: '9876543210',
          email: 'suresh.k@srenterprises.com',
          status: 'ACTIVE',
          skills: ['RO Installation', 'Membrane Replacement', 'TDS Calibration'],
          address: 'Sector 14, Gurgaon',
          emergencyContact: '9811122233',
          userId: null,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
          activeJobsCount: 3,
          completedJobsCount: 45,
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
  useTechnicianDetailQuery: () => ({
    data: null,
    isLoading: false,
  }),
  useCreateTechnicianMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useUpdateTechnicianMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

describe('TechniciansDirectory Component (Phase 7)', () => {
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
            <TechniciansDirectory />
          </BrowserRouter>
        </ToastProvider>
      </QueryClientProvider>
    );

  it('renders page header and Add Technician button', () => {
    renderComponent();
    expect(screen.getByText(/Technicians & Field Workforce/i)).toBeInTheDocument();
    expect(screen.getByText(/Add Technician/i)).toBeInTheDocument();
  });

  it('renders KPI workforce cards with correct counts', () => {
    renderComponent();
    expect(screen.getByText(/Total Workforce/i)).toBeInTheDocument();
    expect(screen.getByText('14')).toBeInTheDocument();
    expect(screen.getAllByText(/Active & Available/i).length).toBeGreaterThan(0);
    expect(screen.getByText('11')).toBeInTheDocument();
    expect(screen.getAllByText(/On Leave/i).length).toBeGreaterThan(0);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders technician records with contact and skills', () => {
    renderComponent();
    expect(screen.getByText('Suresh Kumar')).toBeInTheDocument();
    expect(screen.getByText('9876543210')).toBeInTheDocument();
    expect(screen.getByText('RO Installation')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // active jobs
    expect(screen.getByText('45')).toBeInTheDocument(); // completed jobs
  });
});
