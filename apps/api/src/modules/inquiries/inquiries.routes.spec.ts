import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';

const { mockRedisInstance, mockInquiriesService } = vi.hoisted(() => {
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
  }

  const sampleInquiry = {
    id: '11111111-1111-1111-1111-111111111111',
    inquiryNumber: 'INQ-2026-000001',
    name: 'Suresh Patil',
    phone: '9876543210',
    email: 'suresh@example.com',
    address: 'Kothrud, Pune',
    city: 'Pune',
    inquiryType: 'GENERAL',
    productInterest: 'SR Domestic RO 15L',
    serviceInterest: null,
    message: 'Need installation quote',
    source: 'WEBSITE',
    status: 'NEW',
    priority: 'NORMAL',
    isPossibleDuplicate: false,
    assignedToUserId: null,
    followUpDate: null,
    convertedCustomerId: null,
    convertedAt: null,
    closedAt: null,
    closedReason: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    events: [],
  };

  const mockInquiriesService = {
    getKPIs: vi.fn().mockResolvedValue({
      totalInquiries: 25,
      newInquiries: 8,
      followUpDue: 4,
      convertedCount: 10,
      conversionRate: 40,
    }),
    getInquiries: vi.fn().mockResolvedValue({
      data: [sampleInquiry],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    }),
    getInquiryById: vi.fn().mockResolvedValue(sampleInquiry),
    createInquiry: vi.fn().mockResolvedValue(sampleInquiry),
    updateInquiry: vi.fn().mockResolvedValue({ ...sampleInquiry, name: 'Suresh R Patil' }),
    assignInquiry: vi.fn().mockResolvedValue({
      ...sampleInquiry,
      assignedToUserId: '00000000-0000-0000-0000-000000000001',
    }),
    updateStatus: vi.fn().mockResolvedValue({
      ...sampleInquiry,
      status: 'CONTACTED',
    }),
    addFollowUp: vi.fn().mockResolvedValue({
      ...sampleInquiry,
      status: 'FOLLOW_UP',
      followUpDate: '2026-08-20',
    }),
    convertToCustomer: vi.fn().mockResolvedValue({
      inquiryId: '11111111-1111-1111-1111-111111111111',
      customerId: '22222222-2222-2222-2222-222222222222',
      customerNumber: 'CUST-2026-0001',
      isExistingCustomerLinked: false,
    }),
    closeInquiry: vi.fn().mockResolvedValue({
      ...sampleInquiry,
      status: 'CLOSED',
    }),
    markSpam: vi.fn().mockResolvedValue({
      ...sampleInquiry,
      status: 'SPAM',
    }),
  };

  return {
    mockRedisInstance: new MockRedisStore(),
    mockInquiriesService,
  };
});

vi.mock('../../redis/client', () => ({
  getRedisClient: () => mockRedisInstance,
  redis: mockRedisInstance,
  closeRedisConnection: async () => {},
}));

vi.mock('./inquiries.service', () => ({
  inquiriesService: mockInquiriesService,
}));

vi.mock('../../middleware/auth', () => ({
  authenticate: async (request: any) => {
    request.user = {
      id: '00000000-0000-0000-0000-000000000001',
      userId: '00000000-0000-0000-0000-000000000001',
      username: 'admin',
      displayName: 'System Admin',
      role: 'Super Admin',
      permissions: [
        'inquiries.view',
        'inquiries.create',
        'inquiries.update',
        'inquiries.assign',
        'inquiries.convert',
      ],
    };
  },
}));

import { buildApp } from '../../app';

describe('Inquiries Fastify Routes (Phase 9 Authenticated Operations)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/inquiries/kpis should return aggregated inquiry metrics', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/inquiries/kpis',
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.body);
    expect(json.success).toBe(true);
    expect(json.data.totalInquiries).toBe(25);
    expect(json.data.conversionRate).toBe(40);
  });

  it('GET /api/v1/inquiries should return paginated list of inquiries', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/inquiries?page=1&limit=20',
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.body);
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].inquiryNumber).toBe('INQ-2026-000001');
  });

  it('GET /api/v1/inquiries/:id should return single inquiry with events', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/inquiries/11111111-1111-1111-1111-111111111111',
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.body);
    expect(json.success).toBe(true);
    expect(json.data.name).toBe('Suresh Patil');
  });

  it('POST /api/v1/inquiries/:id/assign should assign staff member', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/inquiries/11111111-1111-1111-1111-111111111111/assign',
      payload: {
        assignedToUserId: '00000000-0000-0000-0000-000000000001',
        notes: 'Assigned to sales manager',
      },
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.body);
    expect(json.success).toBe(true);
    expect(json.data.assignedToUserId).toBe('00000000-0000-0000-0000-000000000001');
  });

  it('POST /api/v1/inquiries/:id/status should update inquiry state', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/inquiries/11111111-1111-1111-1111-111111111111/status',
      payload: {
        status: 'CONTACTED',
        notes: 'Spoke over phone, scheduled demo',
      },
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.body);
    expect(json.success).toBe(true);
    expect(json.data.status).toBe('CONTACTED');
  });

  it('POST /api/v1/inquiries/:id/follow-up should record interaction note', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/inquiries/11111111-1111-1111-1111-111111111111/follow-up',
      payload: {
        notes: 'Followed up regarding machine pricing',
        status: 'FOLLOW_UP',
        followUpDate: '2026-08-20',
        createReminder: true,
      },
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.body);
    expect(json.success).toBe(true);
    expect(json.data.status).toBe('FOLLOW_UP');
  });

  it('POST /api/v1/inquiries/:id/convert should convert inquiry into customer account', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/inquiries/11111111-1111-1111-1111-111111111111/convert',
      payload: {
        customerType: 'INDIVIDUAL',
        addressLine1: 'Flat 101, Galaxy Apts',
        city: 'Pune',
        state: 'Maharashtra',
        postalCode: '411038',
      },
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.body);
    expect(json.success).toBe(true);
    expect(json.data.customerNumber).toBe('CUST-2026-0001');
    expect(json.data.isExistingCustomerLinked).toBe(false);
  });
});
