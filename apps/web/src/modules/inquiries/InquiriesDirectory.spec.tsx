import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { InquiriesDirectory } from './InquiriesDirectory';
import { ToastProvider } from '../../providers/ToastProvider';

// Mock Auth Provider
vi.mock('../../providers/AuthBoundary', () => ({
  useAuth: () => ({
    user: { id: 'usr-1', username: 'admin', role: 'Super Admin' },
    hasPermission: () => true,
  }),
}));

// Mock Inquiries API hooks
vi.mock('./inquiries.api', () => ({
  useInquiryKPIs: () => ({
    data: {
      totalInquiries: 30,
      newInquiries: 12,
      followUpDue: 5,
      convertedCount: 10,
      conversionRate: 33.3,
    },
    isLoading: false,
  }),
  useInquiries: () => ({
    data: {
      data: [
        {
          id: 'inq-1',
          inquiryNumber: 'INQ-2026-000001',
          name: 'Nitin Kulkarni',
          phone: '9876543210',
          email: 'nitin@example.com',
          city: 'Pune',
          inquiryType: 'NEW_RO_PURCHASE',
          productInterest: 'SR Pro 50 LPH RO',
          serviceInterest: null,
          source: 'WEBSITE',
          status: 'NEW',
          priority: 'HIGH',
          isPossibleDuplicate: false,
          assignedToUserId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    },
    isLoading: false,
    refetch: vi.fn(),
  }),
  useCreateInquiry: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useCloseInquiry: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useMarkInquirySpam: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

describe('InquiriesDirectory Component Tests (Phase 9)', () => {
  afterEach(() => {
    cleanup();
  });

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <BrowserRouter>
            <InquiriesDirectory />
          </BrowserRouter>
        </ToastProvider>
      </QueryClientProvider>
    );

  it('renders page header and action buttons', () => {
    renderComponent();
    expect(screen.getByText('Website Inquiries & Leads')).toBeInTheDocument();
    expect(screen.getByText('Add Lead')).toBeInTheDocument();
    expect(screen.getByText('WhatsApp Hub')).toBeInTheDocument();
  });

  it('renders KPI metric summary cards', () => {
    renderComponent();
    expect(screen.getByText('Total Inquiries')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('New Leads')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('Follow-Up Due')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Converted')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('renders inquiry table with row data', () => {
    renderComponent();
    expect(screen.getByText('INQ-2026-000001')).toBeInTheDocument();
    expect(screen.getByText('Nitin Kulkarni')).toBeInTheDocument();
    expect(screen.getByText('9876543210')).toBeInTheDocument();
    expect(screen.getByText('SR Pro 50 LPH RO')).toBeInTheDocument();
  });
});
