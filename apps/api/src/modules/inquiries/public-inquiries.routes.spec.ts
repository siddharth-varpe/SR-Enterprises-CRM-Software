import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';

const { mockRedisInstance, mockInquiriesRepository, mockValidateCaptcha } = vi.hoisted(() => {
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

  const mockValidateCaptcha = vi.fn().mockImplementation(async (_redis, challengeId, userInput) => {
    if (challengeId === 'invalid-challenge' || userInput === '0000') {
      return { isValid: false, reason: 'MISMATCH' };
    }
    return { isValid: true };
  });

  const mockInquiriesRepository = {
    createInquiry: vi.fn().mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      inquiryNumber: 'INQ-2026-000001',
      name: 'Pooja Patil',
      phone: '9876543210',
      email: 'pooja@example.com',
      address: null,
      city: 'Pune',
      inquiryType: 'NEW_RO_PURCHASE',
      productInterest: 'SR Pro Commercial 50 LPH',
      serviceInterest: null,
      message: 'Looking for RO purifier price',
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
    }),
  };

  return {
    mockRedisInstance: new MockRedisStore(),
    mockInquiriesRepository,
    mockValidateCaptcha,
  };
});

vi.mock('../../redis/client', () => ({
  getRedisClient: () => mockRedisInstance,
  redis: mockRedisInstance,
  closeRedisConnection: async () => {},
}));

vi.mock('./inquiries.repository', () => ({
  inquiriesRepository: mockInquiriesRepository,
}));

vi.mock('../../security/captcha', () => ({
  createCaptchaChallenge: vi.fn().mockResolvedValue({
    challengeId: 'test-challenge-id',
    svg: '<svg>captcha</svg>',
  }),
  validateCaptcha: mockValidateCaptcha,
}));

import { buildApp } from '../../app';

describe('Public Inquiries Routes (Phase 9 Website Submissions)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/public/captcha should generate and return a single-use CAPTCHA challenge', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/public/captcha',
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.body);
    expect(json.success).toBe(true);
    expect(json.data.challengeId).toBe('test-challenge-id');
    expect(json.data.svg).toContain('<svg>');
  });

  it('POST /api/v1/public/inquiries should silently reject bots if honeypot websiteUrlHoneypot field is filled', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/public/inquiries',
      payload: {
        name: 'Spam Bot',
        phone: '9876543210',
        message: 'Spamming your site',
        captchaChallengeId: 'valid-chal-123',
        captchaCode: '1234',
        websiteUrlHoneypot: 'http://spam-link.com', // Honeypot filled!
      },
    });

    expect(response.statusCode).toBe(201);
    const json = JSON.parse(response.body);
    expect(json.success).toBe(true);
    expect(json.data.message).toContain('inquiry has been received');
    // Verify that repo was not called for the bot
    expect(mockInquiriesRepository.createInquiry).not.toHaveBeenCalled();
  });

  it('POST /api/v1/public/inquiries should reject submission if CAPTCHA validation fails', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/public/inquiries',
      payload: {
        name: 'Human User',
        phone: '9876543210',
        captchaChallengeId: 'invalid-challenge',
        captchaCode: '0000',
      },
    });

    expect(response.statusCode).toBe(400);
    const json = JSON.parse(response.body);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('CAPTCHA_INVALID');
  });

  it('POST /api/v1/public/inquiries should successfully create inquiry for valid submission', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/public/inquiries',
      payload: {
        name: 'Pooja Patil',
        phone: '9876543210',
        email: 'pooja@example.com',
        city: 'Pune',
        inquiryType: 'NEW_RO_PURCHASE',
        productInterest: 'SR Pro Commercial 50 LPH',
        message: 'Looking for RO purifier price',
        captchaChallengeId: 'valid-chal-123',
        captchaCode: '1234',
      },
    });

    expect(response.statusCode).toBe(201);
    const json = JSON.parse(response.body);
    expect(json.success).toBe(true);
    expect(json.data.inquiryNumber).toBe('INQ-2026-000001');
    expect(mockInquiriesRepository.createInquiry).toHaveBeenCalled();
  });
});
