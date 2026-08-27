import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { WhatsAppHub } from './WhatsAppHub';
import { ToastProvider } from '../../providers/ToastProvider';

// Mock Auth Provider
vi.mock('../../providers/AuthBoundary', () => ({
  useAuth: () => ({
    user: { id: 'usr-1', username: 'admin', role: 'Super Admin' },
    hasPermission: () => true,
  }),
}));

// Mock WhatsApp API hooks
vi.mock('./whatsapp.api', () => ({
  useWhatsAppTemplates: () => ({
    data: [
      {
        id: 'invoice_reminder',
        name: 'invoice_reminder',
        category: 'TRANSACTIONAL',
        language: 'en',
        description: 'Invoice reminder notification',
        parameterKeys: ['customer_name', 'invoice_number', 'amount_due', 'due_date'],
        sampleText: 'Dear {{customer_name}}, invoice {{invoice_number}} of Rs. {{amount_due}} is due.',
      },
    ],
    isLoading: false,
  }),
  useWhatsAppConversations: () => ({
    data: {
      data: [
        {
          id: 'conv-1',
          contactId: 'cnt-1',
          customerId: 'cust-1',
          status: 'ACTIVE',
          unreadCount: 2,
          lastMessagePreview: 'Need filter replacement next week',
          lastMessageAt: new Date().toISOString(),
          customer: {
            id: 'cust-1',
            customerNumber: 'CUST-2026-0001',
            fullName: 'Rajesh Sharma',
          },
          contact: {
            id: 'cnt-1',
            phone: '9876543210',
            optInStatus: 'OPTED_IN',
          },
        },
      ],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    },
    isLoading: false,
  }),
  useWhatsAppConversation: () => ({
    data: null,
    isLoading: false,
  }),
  useWhatsAppMessages: () => ({
    data: { data: [] },
    isLoading: false,
  }),
  useSendWhatsAppTextMessage: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useSendWhatsAppTemplateMessage: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useUpdateWhatsAppConsent: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useMarkWhatsAppConversationRead: () => ({
    mutate: vi.fn(),
  }),
}));

describe('WhatsAppHub Component Tests (Phase 9)', () => {
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
            <WhatsAppHub />
          </BrowserRouter>
        </ToastProvider>
      </QueryClientProvider>
    );

  it('renders WhatsApp Hub header and template action', () => {
    renderComponent();
    expect(screen.getByText('WhatsApp Business Hub')).toBeInTheDocument();
    expect(screen.getAllByText('Send Template')[0]).toBeInTheDocument();
  });

  it('renders conversation thread list with customer name and unread badge', () => {
    renderComponent();
    expect(screen.getByText('Rajesh Sharma')).toBeInTheDocument();
    expect(screen.getByText('9876543210')).toBeInTheDocument();
    expect(screen.getByText('Need filter replacement next week')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders prompt when no conversation is active', () => {
    renderComponent();
    expect(screen.getByText('No conversation selected')).toBeInTheDocument();
  });
});
