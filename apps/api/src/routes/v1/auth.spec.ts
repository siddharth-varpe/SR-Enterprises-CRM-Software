import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';

const { mockRedisInstance } = vi.hoisted(() => {
  class MockRedisStore {
    private store = new Map<string, { value: string; expiresAt: number }>();

    async set(key: string, value: string, _mode?: string, ttlSeconds?: number): Promise<'OK'> {
      const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : Infinity;
      this.store.set(key, { value, expiresAt });
      return 'OK';
    }

    async get(key: string): Promise<string | null> {
      const item = this.store.get(key);
      if (!item) return null;
      if (Date.now() > item.expiresAt) {
        this.store.delete(key);
        return null;
      }
      return item.value;
    }

    async getdel(key: string): Promise<string | null> {
      const val = await this.get(key);
      this.store.delete(key);
      return val;
    }

    async del(...keys: string[]): Promise<number> {
      let count = 0;
      for (const key of keys) {
        if (this.store.delete(key)) count++;
      }
      return count;
    }

    async ttl(key: string): Promise<number> {
      const item = this.store.get(key);
      if (!item) return -2;
      const rem = item.expiresAt - Date.now();
      return rem > 0 ? Math.ceil(rem / 1000) : -2;
    }

    async incr(key: string): Promise<number> {
      const cur = await this.get(key);
      const newVal = cur ? parseInt(cur, 10) + 1 : 1;
      await this.set(key, String(newVal));
      return newVal;
    }

    async expire(key: string, ttlSeconds: number): Promise<number> {
      const item = this.store.get(key);
      if (!item) return 0;
      item.expiresAt = Date.now() + ttlSeconds * 1000;
      return 1;
    }

    async sadd(): Promise<number> {
      return 1;
    }

    async srem(): Promise<number> {
      return 1;
    }

    pipeline() {
      const self = this;
      const ops: Array<() => Promise<any>> = [];
      return {
        get(k: string) {
          ops.push(async () => [null, await self.get(k)]);
          return this;
        },
        del(k: string) {
          ops.push(async () => [null, await self.del(k)]);
          return this;
        },
        async exec() {
          return Promise.all(ops.map((op) => op()));
        },
      };
    }
  }

  return { mockRedisInstance: new MockRedisStore() };
});

vi.mock('../../redis/client', () => ({
  getRedisClient: () => mockRedisInstance,
  redis: mockRedisInstance,
  closeRedisConnection: async () => {},
}));

import { buildApp } from '../../app';

describe('Phase 2 — Auth Endpoints & Security Integration', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/v1/auth/captcha should return an SVG challenge and challengeId', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/captcha',
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.payload);
    expect(json.success).toBe(true);
    expect(json.data.challengeId).toBeDefined();
    expect(json.data.svg).toContain('<svg');
    expect(json.data.svg).toContain('</svg>');
  });

  it('POST /api/v1/auth/login should reject invalid input with 422 Unprocessable Entity', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        username: 'admin',
        // Missing password, challengeId, captchaAnswer
      },
    });

    expect(response.statusCode).toBe(422);
    const json = JSON.parse(response.payload);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/v1/auth/login should reject invalid CAPTCHA challenge', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        username: 'admin',
        password: 'password123',
        challengeId: '00000000-0000-0000-0000-000000000000',
        captchaAnswer: 'WRONG6',
      },
    });

    expect(response.statusCode).toBe(400);
    const json = JSON.parse(response.payload);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('INVALID_CAPTCHA');
  });

  it('GET /api/v1/auth/me should reject unauthenticated request with 401 Unauthorized', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
    });

    expect(response.statusCode).toBe(401);
    const json = JSON.parse(response.payload);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });
});
