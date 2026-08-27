import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import { v1Routes } from '../../routes/v1';

describe('Document Routes Integration Tests — /api/v1/documents', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(fastifyCookie);
    await app.register(v1Routes, { prefix: '/api/v1' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects upload without authentication or missing payload', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/documents/upload',
      payload: {},
    });

    expect([400, 401, 403]).toContain(res.statusCode);
  });

  it('rejects document download for non-existent document or unauthorized access', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/documents/00000000-0000-0000-0000-000000000000/download',
    });

    expect([401, 403, 404]).toContain(res.statusCode);
  });
});
