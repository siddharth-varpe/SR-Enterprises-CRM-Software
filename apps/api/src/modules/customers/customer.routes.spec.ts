import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';

const { mockRedisInstance, mockCustomerService } = vi.hoisted(() => {
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

  const mockCustomerService = {
    getCustomers: vi.fn().mockResolvedValue({
      data: [
        {
          id: '11111111-1111-1111-1111-111111111111',
          customerNumber: 'CUST-2026-0001',
          fullName: 'Rajesh Kumar',
          phone: '9826123456',
          status: 'ACTIVE',
          customerType: 'INDIVIDUAL',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          addresses: [],
        },
      ],
      pagination: { page: 1, pageSize: 20, total: 1 },
    }),
    getCustomerById: vi.fn().mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      customerNumber: 'CUST-2026-0001',
      fullName: 'Rajesh Kumar',
      phone: '9826123456',
      status: 'ACTIVE',
      customerType: 'INDIVIDUAL',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      addresses: [],
    }),
    checkDuplicate: vi.fn().mockResolvedValue({
      isDuplicate: false,
      matchField: null,
      existingCustomer: null,
    }),
    createCustomer: vi.fn().mockResolvedValue({
      id: '22222222-2222-2222-2222-222222222222',
      customerNumber: 'CUST-2026-0002',
      fullName: 'Anita Sharma',
      phone: '9826999999',
      status: 'ACTIVE',
      customerType: 'INDIVIDUAL',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      addresses: [],
    }),
    updateCustomer: vi.fn().mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      customerNumber: 'CUST-2026-0001',
      fullName: 'Rajesh Kumar Updated',
      phone: '9826123456',
      status: 'ACTIVE',
      customerType: 'INDIVIDUAL',
    }),
    archiveCustomer: vi.fn().mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      status: 'ARCHIVED',
    }),
    deleteCustomerCompletely: vi.fn().mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      deleted: true,
      customerNumber: 'CUST-2026-0001',
    }),
    getFinancialSummary: vi.fn().mockResolvedValue({
      customerId: '11111111-1111-1111-1111-111111111111',
      totalBilled: '32000.00',
      totalPaid: '22000.00',
      outstanding: '10000.00',
      overdue: '0.00',
      paymentHealth: 'PARTIALLY_PAID',
    }),
    getCustomerAssets: vi.fn().mockResolvedValue([]),
    getCustomerActivities: vi.fn().mockResolvedValue({ data: [], pagination: { page: 1, pageSize: 50, total: 0 } }),
  };

  return {
    mockRedisInstance: new MockRedisStore(),
    mockCustomerService,
  };
});

vi.mock('../../redis/client', () => ({
  getRedisClient: () => mockRedisInstance,
  redis: mockRedisInstance,
  closeRedisConnection: async () => {},
}));

vi.mock('./customer.service', () => ({
  customerService: mockCustomerService,
}));

// Mock authentication to inject authenticated user with full permissions
vi.mock('../../middleware/auth', () => ({
  authenticate: async (request: any) => {
    request.user = {
      userId: '99999999-9999-9999-9999-999999999999',
      username: 'admin',
      displayName: 'System Admin',
      role: 'Super Admin',
      permissions: [
        'customers.view',
        'customers.create',
        'customers.update',
        'customers.archive',
        'invoices.view',
        'payments.view',
        'sales.view',
        'services.view',
        'warranties.view',
      ],
    };
  },
}));

import { buildApp } from '../../app';

describe('Phase 4 — Customer REST Routes Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/customers should return paginated customer directory', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/customers',
      query: { page: '1', limit: '20', search: 'Rajesh' },
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.payload);
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].fullName).toBe('Rajesh Kumar');
    expect(json.pagination.total).toBe(1);
  });

  it('GET /api/v1/customers/check-duplicate should check phone/email', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/customers/check-duplicate',
      query: { phone: '9826123456' },
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.payload);
    expect(json.success).toBe(true);
    expect(json.data.isDuplicate).toBe(false);
  });

  it('POST /api/v1/customers should validate input and create customer', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/customers',
      payload: {
        fullName: 'Anita Sharma',
        phone: '9826999999',
        email: 'anita@example.com',
        customerType: 'INDIVIDUAL',
        addresses: [
          {
            addressType: 'SERVICE',
            addressLine1: 'Plot 101, Shankar Nagar',
            city: 'Raipur',
            state: 'Chhattisgarh',
            postalCode: '492001',
            isDefault: true,
          },
        ],
      },
    });

    expect(response.statusCode).toBe(201);
    const json = JSON.parse(response.payload);
    expect(json.success).toBe(true);
    expect(json.data.fullName).toBe('Anita Sharma');
  });

  it('POST /api/v1/customers should reject invalid input with 422', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/customers',
      payload: {
        fullName: '', // Invalid empty name
        phone: '123', // Invalid short phone
        addresses: [], // Missing required address
      },
    });

    expect(response.statusCode).toBe(422);
    const json = JSON.parse(response.payload);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /api/v1/customers/:id should return single customer profile', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/customers/11111111-1111-1111-1111-111111111111',
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.payload);
    expect(json.success).toBe(true);
    expect(json.data.fullName).toBe('Rajesh Kumar');
  });

  it('GET /api/v1/customers/:id/financial-summary should return financial read model', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/customers/11111111-1111-1111-1111-111111111111/financial-summary',
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.payload);
    expect(json.success).toBe(true);
    expect(json.data.totalBilled).toBe('32000.00');
    expect(json.data.outstanding).toBe('10000.00');
  });

  it('POST /api/v1/customers/:id/archive should soft archive customer', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/customers/11111111-1111-1111-1111-111111111111/archive',
      payload: { reason: 'Customer moved out of service territory' },
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.payload);
    expect(json.success).toBe(true);
    expect(json.data.status).toBe('ARCHIVED');
  });

  it('DELETE /api/v1/customers/:id should permanently delete customer and all linked data', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/customers/11111111-1111-1111-1111-111111111111',
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.payload);
    expect(json.success).toBe(true);
    expect(json.data.deleted).toBe(true);
  });
});
