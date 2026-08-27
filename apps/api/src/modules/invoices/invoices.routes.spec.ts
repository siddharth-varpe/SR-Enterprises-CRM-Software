import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';

const { mockRedisInstance, mockInvoicesService } = vi.hoisted(() => {
  class MockRedisStore {
    private store = new Map<string, { value: string; expiresAt: number }>();
    async set(key: string, value: string): Promise<'OK'> {
      this.store.set(key, { value, expiresAt: Infinity });
      return 'OK';
    }
    async get(key: string): Promise<string | null> {
      const item = this.store.get(key);
      return item ? item.value : null;
    }
    async del(key: string): Promise<number> {
      return this.store.delete(key) ? 1 : 0;
    }
    async expire(): Promise<number> {
      return 1;
    }
  }

  const mockInvoicesService = {
    getInvoices: vi.fn().mockResolvedValue({
      data: [
        {
          id: '33333333-3333-3333-3333-333333333333',
          invoiceNumber: 'INV-2026-0001',
          customerId: '22222222-2222-2222-2222-222222222222',
          customerName: 'Rajesh Kumar',
          invoiceDate: new Date().toISOString(),
          dueDate: new Date(Date.now() + 15 * 86400000).toISOString(),
          subtotal: '18900.00',
          discountAmount: '0.00',
          taxAmount: '3402.00',
          totalAmount: '22302.00',
          paidAmount: '0.00',
          outstandingAmount: '22302.00',
          status: 'ISSUED',
        },
      ],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    }),
    getInvoiceById: vi.fn().mockResolvedValue({
      id: '33333333-3333-3333-3333-333333333333',
      invoiceNumber: 'INV-2026-0001',
      customerId: '22222222-2222-2222-2222-222222222222',
      customerName: 'Rajesh Kumar',
      customerPhone: '9826123456',
      invoiceDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 15 * 86400000).toISOString(),
      subtotal: '18900.00',
      discountAmount: '0.00',
      taxAmount: '3402.00',
      totalAmount: '22302.00',
      paidAmount: '0.00',
      outstandingAmount: '22302.00',
      status: 'ISSUED',
      items: [
        {
          id: '66666666-6666-6666-6666-666666666666',
          nameSnapshot: 'Kent Grand Plus RO+UV+UF+TDS Controller',
          quantity: 1,
          unitPriceSnapshot: '18900.00',
          discountAmount: '0.00',
          taxAmount: '3402.00',
          lineTotal: '22302.00',
        },
      ],
      addresses: [],
      payments: [],
    }),
    cancelInvoice: vi.fn().mockResolvedValue({
      id: '33333333-3333-3333-3333-333333333333',
      invoiceNumber: 'INV-2026-0001',
      status: 'CANCELLED',
      cancelReason: 'Billing correction',
    }),
  };

  return {
    mockRedisInstance: new MockRedisStore(),
    mockInvoicesService,
  };
});

vi.mock('../../redis/client', () => ({
  getRedisClient: () => mockRedisInstance,
  redis: mockRedisInstance,
  closeRedisConnection: async () => {},
}));

vi.mock('./invoices.service', () => ({
  invoicesService: mockInvoicesService,
}));

vi.mock('../../middleware/auth', () => ({
  authenticate: async (request: any) => {
    request.user = {
      userId: '00000000-0000-0000-0000-000000000001',
      username: 'admin',
      displayName: 'System Admin',
      role: 'Super Admin',
      permissions: [
        'invoices.view',
        'invoices.create',
        'invoices.cancel',
      ],
    };
  },
}));

import { buildApp } from '../../app';

describe('Invoices Fastify Routes Integration', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('GET /api/v1/invoices returns 200 with paginated invoice list and calculated ledger totals', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/invoices?page=1&limit=20',
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].invoiceNumber).toBe('INV-2026-0001');
    expect(body.data[0].outstandingAmount).toBe('22302.00');
  });

  it('GET /api/v1/invoices/:id returns 200 with full invoice and item snapshots', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/invoices/33333333-3333-3333-3333-333333333333',
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.invoiceNumber).toBe('INV-2026-0001');
    expect(body.data.items).toHaveLength(1);
  });

  it('POST /api/v1/invoices/:id/cancel cancels invoice and returns 200', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/invoices/33333333-3333-3333-3333-333333333333/cancel',
      payload: {
        reason: 'Billing correction',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('CANCELLED');
  });
});
