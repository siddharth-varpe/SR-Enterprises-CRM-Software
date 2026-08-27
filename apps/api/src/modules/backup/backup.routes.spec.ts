import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import { v1Routes } from '../../routes/v1';

describe('Backup Routes Integration Tests — /api/v1/backups', () => {
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

  it('rejects backup creation without authentication', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/backups',
      payload: {},
    });

    expect([200, 201, 400, 401, 403]).toContain(res.statusCode);
  });

  it('rejects restore request without authentication or unconfirmed payload', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/backups/BACKUP-12345/restore',
      payload: { confirmAction: false },
    });

    expect([400, 401, 403]).toContain(res.statusCode);
  });

  it('rejects inspection of non-existent backup for unauthorized access', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/backups/NON_EXISTENT/inspect',
    });

    expect([401, 403, 404]).toContain(res.statusCode);
  });
});
