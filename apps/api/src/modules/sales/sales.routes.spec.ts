import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';

const { mockRedisInstance, mockSalesService } = vi.hoisted(() => {
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

  const mockSalesService = {
    getSales: vi.fn().mockResolvedValue({
      data: [
        {
          id: '11111111-1111-1111-1111-111111111111',
          saleNumber: 'SALE-2026-0001',
          customerId: '22222222-2222-2222-2222-222222222222',
          customerName: 'Rajesh Kumar',
          customerPhone: '9826123456',
          saleDate: new Date().toISOString(),
          status: 'COMPLETED',
          subtotal: '18900.00',
          discountAmount: '0.00',
          taxAmount: '3402.00',
          totalAmount: '22302.00',
          invoice: {
            id: '33333333-3333-3333-3333-333333333333',
            invoiceNumber: 'INV-2026-0001',
            status: 'ISSUED',
          },
        },
      ],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    }),
    getSaleById: vi.fn().mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      saleNumber: 'SALE-2026-0001',
      customerId: '22222222-2222-2222-2222-222222222222',
      customerName: 'Rajesh Kumar',
      saleDate: new Date().toISOString(),
      status: 'COMPLETED',
      subtotal: '18900.00',
      discountAmount: '0.00',
      taxAmount: '3402.00',
      totalAmount: '22302.00',
      items: [
        {
          id: '44444444-4444-4444-4444-444444444444',
          productNameSnapshot: 'Kent Grand Plus RO+UV+UF+TDS Controller',
          skuSnapshot: 'KG-PLUS-002',
          quantity: 1,
          unitPriceSnapshot: '18900.00',
          discountAmount: '0.00',
          taxAmount: '3402.00',
          lineTotal: '22302.00',
        },
      ],
      invoice: {
        id: '33333333-3333-3333-3333-333333333333',
        invoiceNumber: 'INV-2026-0001',
        status: 'ISSUED',
      },
      assets: [],
    }),
    createSale: vi.fn().mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      saleNumber: 'SALE-2026-0001',
      status: 'DRAFT',
      totalAmount: '22302.00',
    }),
    updateDraftSale: vi.fn().mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      status: 'DRAFT',
      notes: 'Updated notes',
    }),
    confirmSale: vi.fn().mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      saleNumber: 'SALE-2026-0001',
      status: 'COMPLETED',
      invoice: {
        id: '33333333-3333-3333-3333-333333333333',
        invoiceNumber: 'INV-2026-0001',
      },
    }),
    cancelSale: vi.fn().mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      status: 'CANCELLED',
      cancelReason: 'Customer changed mind',
    }),
  };

  return {
    mockRedisInstance: new MockRedisStore(),
    mockSalesService,
  };
});

vi.mock('../../redis/client', () => ({
  getRedisClient: () => mockRedisInstance,
  redis: mockRedisInstance,
  closeRedisConnection: async () => {},
}));

vi.mock('./sales.service', () => ({
  salesService: mockSalesService,
}));

vi.mock('../../middleware/auth', () => ({
  authenticate: async (request: any) => {
    request.user = {
      userId: '00000000-0000-0000-0000-000000000001',
      username: 'admin',
      displayName: 'System Admin',
      role: 'Super Admin',
      permissions: [
        'sales.view',
        'sales.create',
        'sales.update',
        'sales.confirm',
        'sales.cancel',
      ],
    };
  },
}));

import { buildApp } from '../../app';

describe('Sales Fastify Routes Integration', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('GET /api/v1/sales returns 200 with paginated sales list', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/sales?page=1&limit=20',
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].saleNumber).toBe('SALE-2026-0001');
  });

  it('GET /api/v1/sales/:id returns 200 with complete sale details', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/sales/11111111-1111-1111-1111-111111111111',
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.saleNumber).toBe('SALE-2026-0001');
    expect(body.data.items).toHaveLength(1);
  });

  it('POST /api/v1/sales creates new sale and returns 201', async () => {
    const payload = {
      customerId: '22222222-2222-2222-2222-222222222222',
      saleDate: new Date().toISOString(),
      items: [
        {
          productId: '55555555-5555-5555-5555-555555555555',
          quantity: 1,
          unitPrice: 18900,
          discountAmount: 0,
          taxRatePercent: 18,
        },
      ],
      status: 'DRAFT',
    };

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/sales',
      payload,
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('DRAFT');
  });

  it('POST /api/v1/sales/:id/confirm confirms sale and returns 200', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/sales/11111111-1111-1111-1111-111111111111/confirm',
      payload: {
        installationNotes: 'Ground floor kitchen placement',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('COMPLETED');
  });

  it('POST /api/v1/sales/:id/cancel cancels sale with reason and returns 200', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/sales/11111111-1111-1111-1111-111111111111/cancel',
      payload: {
        reason: 'Customer changed mind',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('CANCELLED');
  });
});
